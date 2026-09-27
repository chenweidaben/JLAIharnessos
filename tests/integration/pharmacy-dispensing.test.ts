/**
 * 健澜科技 jlmedaios - 药房调剂发药 + 库存真实联动 + CDS 拦截留痕 集成测试（M2-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（不经 mock），覆盖：
 *  - 药师审方（pending_review → approved/rejected）与待审/待发队列；
 *  - FEFO 调剂发药：原子扣库存 + 库存流水 + 幂等发药记录 + 处方置 dispensed；
 *  - 发药幂等（重复发药返回 deduplicated:true，不二次扣库存）；
 *  - CDS 过敏拦截（ALL-001）：无 override 409、药师自授权 403、医师 override 成功且留痕签名；
 *  - 职责分离：护士/医师发药 403；
 *  - 并发：同一处方并发发药仅一次成功、库存只扣一次、不超扣为负；
 *  - BFF 路由层：权限码 403、成功路径统一信封。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。测试扣减的库存在 afterAll 原样补回（不污染库存）。
 *
 * 运行：bun test tests/integration/pharmacy-dispensing.test.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import {
  closeDbForTest,
  getDb,
  verifyDbConnection,
  withTx,
} from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { createPatient, type Patient } from '../../src/db/repositories/patientRepo.js';
import { createVisit, type Visit } from '../../src/db/repositories/visitRepo.js';
import {
  createPrescription,
  type Prescription,
  type PrescriptionItem,
} from '../../src/db/repositories/prescriptionRepo.js';
import {
  deductInventory,
  insertMovement,
  listBatchesForDrug,
  listInventory,
  receiveStock,
} from '../../src/db/repositories/inventoryRepo.js';
import {
  listDispensingsByPrescription,
  listRecentDispensings,
} from '../../src/db/repositories/dispensingRepo.js';
import {
  PharmacyError,
  dispensePrescription,
  getDispenseQueue,
  getDispensingRecords,
  getInventory,
  getInventoryMovements,
  getPrescriptionsForVisitView,
  getReviewQueue,
  previewDispenseCds,
  reviewPendingPrescription,
} from '../../src/bff/aggregators/pharmacyAggregator.js';
import { pharmacyRoutes } from '../../src/bff/routes/pharmacy.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let pharmacist: AuthView;
let doctor: AuthView;
let nurse: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** 需要补回的库存扣减：drugId + batchNo + qty。 */
const restoreList: Array<{ drugId: string; batchNo: string; qty: number }> = [];

function makeItem(
  drugCode: string,
  drugName: string,
  qty: number,
  unit = '片',
): PrescriptionItem {
  return {
    drugCode, drugName, specification: null, dosage: null, dosageUnit: null,
    frequency: 'qd', route: '口服', daysSupply: null, quantity: qty,
    quantityUnit: unit, skinTest: false, remark: null,
  };
}

/** 新建患者 + 门诊就诊。 */
async function newPatientVisit(opts?: {
  allergies?: Array<Record<string, unknown>>;
}): Promise<{ patient: Patient; visit: Visit }> {
  const patient = await createPatient({
    mrn: `M2A${seq()}`,
    nameMasked: `测*${seq().slice(-4)}`,
    gender: '未知',
    birthDate: null,
    allergies: opts?.allergies,
    tags: ['M2A_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'outpatient',
    department: '内科',
  });
  return { patient, visit };
}

/** 开方并由药师审方通过（返回 approved 处方）。 */
async function newApprovedRx(
  visit: Visit,
  items: PrescriptionItem[],
): Promise<Prescription> {
  const rx = await createPrescription({
    visitId: visit.id,
    prescriberId: doctor.id,
    items,
  });
  const approved = await reviewPendingPrescription(pharmacist, rx.id, {
    decision: 'approved',
  });
  expect(approved.status).toBe('approved');
  return approved;
}

// 模块加载期（describe 注册前）确定 DB 可用性，使 describe.skipIf 正确生效（TLA）。
try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  pharmacist = await load('pharmacist_wang');
  doctor = await load('doctor_li');
  nurse = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    // 原样补回测试扣减的库存（直接修正数量，不写业务流水）。
    const db = getDb();
    for (const r of restoreList) {
      await db`
        UPDATE clinical.drug_inventory SET quantity = quantity + ${r.qty}
        WHERE drug_id = ${r.drugId} AND batch_no = ${r.batchNo}
      `;
    }
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M2-A 审方与队列', () => {
  it('待审队列包含新处方，药师审方通过后进入待发队列', async () => {
    const { visit } = await newPatientVisit();
    const rx = await createPrescription({
      visitId: visit.id,
      prescriberId: doctor.id,
      items: [makeItem('D021', '对乙酰氨基酚', 3)],
    });

    const reviewBefore = await getReviewQueue(pharmacist);
    expect(reviewBefore.some((q) => q.prescription.id === rx.id)).toBe(true);

    const approved = await reviewPendingPrescription(pharmacist, rx.id, {
      decision: 'approved',
    });
    expect(approved.status).toBe('approved');

    const dispenseQueue = await getDispenseQueue(pharmacist);
    expect(dispenseQueue.some((q) => q.prescription.id === rx.id)).toBe(true);
  });

  it('药师退回处方须为 rejected 并留痕', async () => {
    const { visit } = await newPatientVisit();
    const rx = await createPrescription({
      visitId: visit.id,
      prescriberId: doctor.id,
      items: [makeItem('D021', '对乙酰氨基酚', 3)],
    });
    const rejected = await reviewPendingPrescription(pharmacist, rx.id, {
      decision: 'rejected',
      comment: '用法不适宜（测试）',
    });
    expect(rejected.status).toBe('rejected');
    // 退回的处方不在待发队列
    const q = await getDispenseQueue(pharmacist);
    expect(q.some((x) => x.prescription.id === rx.id)).toBe(false);
  });

  it('非 pending_review 状态重复审方报 409', async () => {
    const { visit } = await newPatientVisit();
    const rx = await createPrescription({
      visitId: visit.id,
      items: [makeItem('D021', '对乙酰氨基酚', 2)],
    });
    await reviewPendingPrescription(pharmacist, rx.id, { decision: 'approved' });
    await expect(
      reviewPendingPrescription(pharmacist, rx.id, { decision: 'approved' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe.skipIf(!dbAvailable)('M2-A 调剂发药 + 库存真实联动', () => {
  it('发药成功：处方置 dispensed，库存按 FEFO 扣减，写流水与发药记录', async () => {
    const { visit } = await newPatientVisit();
    const rx = await newApprovedRx(visit, [makeItem('D021', '对乙酰氨基酚', 4)]);

    const before = (await listInventory({ keyword: '对乙酰氨基酚', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D021',
    )!;
    const beforeQty = before.quantity;

    const result = await dispensePrescription(pharmacist, rx.id, { warehouse: '中心药房' });
    expect(result.prescription.status).toBe('dispensed');
    expect(result.dispensings).toHaveLength(1);
    const d = result.dispensings[0];
    expect(d.drugName).toBe('对乙酰氨基酚');
    expect(d.quantity).toBe(4);
    expect(d.batchNo).toBe('LOT-D021');
    expect(d.overrideReason).toBeNull();

    const after = (await listInventory({ keyword: '对乙酰氨基酚', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D021',
    )!;
    expect(after.quantity).toBe(beforeQty - 4);

    restoreList.push({ drugId: after.drugId, batchNo: after.batchNo!, qty: 4 });
  });

  it('发药幂等：同一处方重复发药返回 deduplicated:true，不二次扣库存', async () => {
    const { visit } = await newPatientVisit();
    const rx = await newApprovedRx(visit, [makeItem('D022', '奥美拉唑', 2)]);
    const before = (await listInventory({ keyword: '奥美拉唑', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D022',
    )!;
    const first = await dispensePrescription(pharmacist, rx.id, {});
    expect(first.prescription.status).toBe('dispensed');
    expect(first.deduplicated).toBe(false);
    restoreList.push({
      drugId: first.dispensings[0].drugId!,
      batchNo: first.dispensings[0].batchNo!,
      qty: 2,
    });

    // 重复发药：设计为幂等成功（deduplicated:true），而非 409；不二次扣库存
    const again = await dispensePrescription(pharmacist, rx.id, {});
    expect(again.deduplicated).toBe(true);
    expect(again.prescription.status).toBe('dispensed');
    expect(again.dispensings).toHaveLength(1); // 仍只有一条发药记录

    const after = (await listInventory({ keyword: '奥美拉唑', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D022',
    )!;
    expect(after.quantity).toBe(before.quantity - 2); // 净扣仅一次
  });

  it('库存不足时发药失败并整体回滚（不产生部分扣减）', async () => {
    const { visit } = await newPatientVisit();
    // 数量超过库存（200），触发不足
    const rx = await newApprovedRx(visit, [makeItem('D020', '布洛芬', 5000)]);
    await expect(
      dispensePrescription(pharmacist, rx.id, {}),
    ).rejects.toMatchObject({ status: 409 });

    // 库存未被改动（仍为 200）
    const inv = (await listInventory({ keyword: '布洛芬', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D020',
    )!;
    expect(inv.quantity).toBe(200);
  });
});

describe.skipIf(!dbAvailable)('M2-A CDS 拦截与 override 留痕', () => {
  it('青霉素过敏患者开青霉素钠：CDS 预览命中 ALL-001 block', async () => {
    const { visit } = await newPatientVisit({
      allergies: [{ allergen: '青霉素', severity: 'rash' }],
    });
    const rx = await newApprovedRx(visit, [makeItem('D019', '青霉素钠', 5)]);
    const preview = await previewDispenseCds(pharmacist, rx.id);
    expect(preview.passed).toBe(false);
    expect(preview.blocks.some((b) => b.ruleId === 'ALL-001')).toBe(true);
  });

  it('无 override 原因强发 block 药 → 409 CDS_BLOCK', async () => {
    const { visit } = await newPatientVisit({
      allergies: [{ allergen: '青霉素', severity: 'rash' }],
    });
    const rx = await newApprovedRx(visit, [makeItem('D019', '青霉素钠', 5)]);
    const err = await dispensePrescription(pharmacist, rx.id, {}).catch((e) => e);
    expect(err).toBeInstanceOf(PharmacyError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('CDS_BLOCK');
  });

  it('药师自授权 override（无 cds:override 权限）→ 403 职责分离', async () => {
    const { visit } = await newPatientVisit({
      allergies: [{ allergen: '青霉素', severity: 'rash' }],
    });
    const rx = await newApprovedRx(visit, [makeItem('D019', '青霉素钠', 5)]);
    const err = await dispensePrescription(pharmacist, rx.id, {
      overrideReason: '药师自行决定（测试）',
      overrideAuthorId: pharmacist.id,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(PharmacyError);
    expect(err.status).toBe(403);
  });

  it('医师 cds:override 授权后发药成功，发药记录与审计留痕签名', async () => {
    const { visit } = await newPatientVisit({
      allergies: [{ allergen: '青霉素', severity: 'rash' }],
    });
    const rx = await newApprovedRx(visit, [makeItem('D019', '青霉素钠', 5)]);
    const before = (await listInventory({ keyword: '青霉素钠', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D019',
    )!;

    const result = await dispensePrescription(pharmacist, rx.id, {
      overrideReason: '重症感染确需青霉素，已脱敏并监护（测试）',
      overrideAuthorId: doctor.id,
    });
    expect(result.prescription.status).toBe('dispensed');
    const d = result.dispensings[0];
    expect(d.overrideReason).toContain('重症感染');
    expect(d.overrideBy).toBe(doctor.id); // override 决策归医师
    expect(d.dispensedBy).toBe(pharmacist.id); // 发药执行归药师
    expect(d.cdsHits.some((h) => h.ruleId === 'ALL-001')).toBe(true);

    restoreList.push({ drugId: before.drugId, batchNo: before.batchNo!, qty: 5 });
  });
});

describe.skipIf(!dbAvailable)('M2-A 职责分离：护士/医师不可发药', () => {
  it('护士发药 → 403', async () => {
    const { visit } = await newPatientVisit();
    const rx = await newApprovedRx(visit, [makeItem('D021', '对乙酰氨基酚', 2)]);
    const err = await dispensePrescription(nurse, rx.id, {}).catch((e) => e);
    expect(err.status).toBe(403);
  });

  it('医师发药 → 403', async () => {
    const { visit } = await newPatientVisit();
    const rx = await newApprovedRx(visit, [makeItem('D021', '对乙酰氨基酚', 2)]);
    const err = await dispensePrescription(doctor, rx.id, {}).catch((e) => e);
    expect(err.status).toBe(403);
  });
});

describe.skipIf(!dbAvailable)('M2-A 并发发药：仅一次成功、不超扣为负', () => {
  it('同一处方 8 个并发发药，恰 1 个成功，库存只扣一次', async () => {
    const { visit } = await newPatientVisit();
    const rx = await newApprovedRx(visit, [makeItem('D009', '二甲双胍', 6)]);
    const before = (await listInventory({ keyword: '二甲双胍', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D009',
    )!;

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        dispensePrescription(pharmacist, rx.id, {}),
      ),
    );
    const values = attempts
      .filter((a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof dispensePrescription>>> => a.status === 'fulfilled')
      .map((a) => a.value);
    const rejected = attempts.filter((a) => a.status === 'rejected');

    // 恰 1 次真实发药（deduplicated:false）；其余为幂等返回（deduplicated:true）或 409 冲突回滚
    const real = values.filter((v) => v.deduplicated === false);
    const dedup = values.filter((v) => v.deduplicated === true);
    expect(real).toHaveLength(1);
    expect(dedup.length + rejected.length).toBe(7);
    // 进入事务却落选的并发，必须以 409 回滚（其库存扣减随事务回滚）
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason?.status).toBe(409);
    }

    const after = (await listInventory({ keyword: '二甲双胍', limit: 5 })).find(
      (i) => i.batchNo === 'LOT-D009',
    )!;
    expect(after.quantity).toBe(before.quantity - 6); // 净扣仅一次
    expect(after.quantity).toBeGreaterThanOrEqual(0); // 不超扣为负

    restoreList.push({ drugId: after.drugId, batchNo: after.batchNo!, qty: 6 });
  });
});

/* --------------- repo 补覆盖：批次/收货/流水/记录/自动选批 --------------- */

describe.skipIf(!dbAvailable)('M2-A 库存与发药 repo：批次/收货/流水/记录', () => {
  it('listBatchesForDrug 按近效期升序返回该药品该药房批次', async () => {
    const seed = (await listInventory({ keyword: '二甲双胍', limit: 10 }))[0];
    expect(seed).toBeTruthy();
    const batches = await listBatchesForDrug(seed.drugId, seed.warehouse);
    expect(batches.length).toBeGreaterThan(0);
    for (const b of batches) {
      expect(b.drugId).toBe(seed.drugId);
      expect(b.warehouse).toBe(seed.warehouse);
    }
    for (let i = 1; i < batches.length; i++) {
      if (batches[i - 1].expiryDate && batches[i].expiryDate) {
        expect(batches[i - 1].expiryDate! <= batches[i].expiryDate!).toBe(true);
      }
    }
  });

  it('deductInventory 未指定批次时 FEFO 自动选批；receiveStock 收货补回，库存净变动为零且流水齐全', async () => {
    const seed = (await listInventory({ keyword: '二甲双胍', limit: 10 }))[0];
    const { drugId, warehouse } = seed;

    // 1) 自动 FEFO 选批扣 1（不指定 batch），写 adjust 流水
    const ded = await withTx(async (tx) => {
      const r = await deductInventory(tx, { drugId, warehouse, qty: 1 });
      if (r) {
        await insertMovement(tx, {
          drugId, warehouse, batchNo: r.inventory.batchNo, changeQty: -1,
          balanceAfter: r.inventory.quantity, reason: 'adjust', refType: 'test',
          refId: null, actorId: pharmacist.id,
        });
      }
      return r;
    });
    expect(ded).not.toBeNull();
    const hitBatch = ded!.inventory.batchNo!;
    const afterDeductQty = ded!.inventory.quantity;

    // 2) 收货 +1 补回该批次 → 库存净零
    const recv = await receiveStock({
      drugId, warehouse, batchNo: hitBatch, qty: 1, actorId: pharmacist.id,
    });
    expect(recv).not.toBeNull();
    expect(recv!.quantity).toBe(afterDeductQty + 1);

    // 3) receive 流水可按原因过滤查到（changeQty +1）
    const recvMoves = await getInventoryMovements(pharmacist, {
      warehouse, reason: 'receive',
    });
    expect(recvMoves.some((x) => x.changeQty === 1 && x.batchNo === hitBatch)).toBe(true);
  });

  it('receiveStock 对无匹配批次返回 null（不臆造库存）', async () => {
    const r = await receiveStock({
      drugId: crypto.randomUUID(), warehouse: '中心药房', qty: 1, actorId: pharmacist.id,
    });
    expect(r).toBeNull();
  });

  it('发药后：按处方查记录、最近发药总览、库存/流水/按就诊查处方视图均自洽', async () => {
    const { visit } = await newPatientVisit();
    const rx = await newApprovedRx(visit, [makeItem('D022', '奥美拉唑', 2)]);
    const res = await dispensePrescription(pharmacist, rx.id, {});
    expect(res.deduplicated).toBe(false);
    restoreList.push({
      drugId: res.dispensings[0].drugId!,
      batchNo: res.dispensings[0].batchNo!,
      qty: 2,
    });

    // repo 直查
    const byRx = await listDispensingsByPrescription(rx.id);
    expect(byRx).toHaveLength(1);
    expect(byRx[0].quantity).toBe(2);
    const recent = await listRecentDispensings({ warehouse: '中心药房', limit: 50 });
    expect(recent.some((d) => d.prescriptionId === rx.id)).toBe(true);

    // 聚合器视图
    const hist = await getDispensingRecords(pharmacist, { prescriptionId: rx.id });
    expect(hist).toHaveLength(1);
    const moves = await getInventoryMovements(pharmacist, { warehouse: '中心药房' });
    expect(moves.some((x) => x.refId === rx.id && x.changeQty === -2)).toBe(true);
    const visitRx = await getPrescriptionsForVisitView(pharmacist, visit.id);
    expect(visitRx.some((p) => p.id === rx.id)).toBe(true);
    const inv = await getInventory(pharmacist, { warehouse: '中心药房' });
    expect(Array.isArray(inv)).toBe(true);
  });
});

/* ------------------------------ BFF 路由层 ------------------------------ */

function makeCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = view
    ? {
        id: view.id,
        name: view.realName,
        roles: view.rawRoles,
        permissions: view.permissions,
      }
    : null;
  return {
    method: 'GET',
    path: '',
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    headers: new Headers(),
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}

function findRoute(method: string, path: string) {
  return pharmacyRoutes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M2-A BFF 路由：权限信封', () => {
  it('无 pharmacy:dispense 权限（护士）→ 403', async () => {
    const route = findRoute('POST', '/api/v1/pharmacy/prescriptions/:id/dispense');
    const res = await route.handle(makeCtx(nurse, { params: { id: 'x' } }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).not.toBe(0);
  });

  it('待发队列成功路径返回统一信封', async () => {
    const route = findRoute('GET', '/api/v1/pharmacy/queue/dispense');
    const res = await route.handle(makeCtx(pharmacist));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('库存查询成功路径返回统一信封', async () => {
    const route = findRoute('GET', '/api/v1/pharmacy/inventory');
    const res = await route.handle(makeCtx(pharmacist));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
  });

  it('按就诊查处方缺少 visitId → 400', async () => {
    const route = findRoute('GET', '/api/v1/pharmacy/prescriptions');
    const res = await route.handle(makeCtx(pharmacist));
    expect(res.status).toBe(400);
  });

  it('待审队列 / 发药记录 / 库存流水 GET 均返回统一信封', async () => {
    const review = await findRoute('GET', '/api/v1/pharmacy/queue/review')
      .handle(makeCtx(pharmacist));
    expect(review.status).toBe(200);
    expect((await review.json()).code).toBe(0);

    const disp = await findRoute('GET', '/api/v1/pharmacy/dispensings')
      .handle(makeCtx(pharmacist, { query: { warehouse: '中心药房' } }));
    expect(disp.status).toBe(200);
    expect(Array.isArray((await disp.json()).data)).toBe(true);

    const moves = await findRoute('GET', '/api/v1/pharmacy/inventory/movements')
      .handle(makeCtx(pharmacist, { query: { warehouse: '中心药房' } }));
    expect(moves.status).toBe(200);
    expect(Array.isArray((await moves.json()).data)).toBe(true);
  });

  it('按就诊查处方提供 visitId → 200 且含该就诊处方', async () => {
    const { visit } = await newPatientVisit();
    const rx = await newApprovedRx(visit, [makeItem('D022', '奥美拉唑', 1)]);
    const route = findRoute('GET', '/api/v1/pharmacy/prescriptions');
    const res = await route.handle(makeCtx(pharmacist, { query: { visitId: visit.id } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect((body.data as Array<{ id: string }>).some((p) => p.id === rx.id)).toBe(true);
  });

  it('无 pharmacy:view 权限查待发队列 → 403', async () => {
    const noPerm = {
      id: 'no-such-user', realName: '无权限', permissions: [], rawRoles: [],
    } as unknown as AuthView;
    const route = findRoute('GET', '/api/v1/pharmacy/queue/dispense');
    const res = await route.handle(makeCtx(noPerm));
    expect(res.status).toBe(403);
    expect((await res.json()).code).not.toBe(0);
  });
});
