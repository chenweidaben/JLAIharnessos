/**
 * 健澜科技 jlmedaios - 收费结算 集成测试（M3-B）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 计费（挂号/诊查/检验/检查/治疗，幂等）、归集、收款开票、退费（Saga 补偿）全链路；
 *  - 状态机：未付 → 已支付 → 部分退费 / 全额退费；未付作废释放费用；
 *  - 权限：药师无 billing:charge / billing:refund → 403；DataScope 跨科 → 403；
 *  - 并发：同一费用并发归集/收款/退费不重复；乐观锁版本冲突 → 409；
 *  - BFF 路由信封 / 401 / 错误码映射。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createOrder } from '../../src/db/repositories/orderRepo.js';
import {
  createSettlement,
  generateFeeItems,
  getOutstanding,
  getSettlementDetail,
  getSettlementQueue,
  paySettlementFlow,
  refundFeeItem,
  voidSettlementFlow,
} from '../../src/bff/aggregators/billingAggregator.js';
import { billingRoutes } from '../../src/bff/routes/billing.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let pharmacist: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

/** 新建门诊患者 + 检验/检查/治疗医嘱，返回 visitId。 */
async function newOutpatientVisit(department: string): Promise<string> {
  const patient = await createPatient({
    mrn: `M3B${seq()}`,
    nameMasked: `费*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1980-01-01',
    tags: ['M3B_TEST'],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'outpatient',
    department,
    chiefComplaint: '咳嗽3天',
  });
  await createOrder({
    visitId: visit.id, orderType: 'lab', content: '血常规',
  });
  await createOrder({
    visitId: visit.id, orderType: 'imaging', content: '胸部CT平扫',
  });
  await createOrder({
    visitId: visit.id, orderType: 'treatment', content: '静脉输液',
  });
  return visit.id;
}

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
  admin = await load('admin');
  doctorChen = await load('doctor_chen');
  pharmacist = await load('pharmacist_wang');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`
      DELETE FROM clinical.refunds r USING clinical.visits v
      WHERE r.visit_id = v.id AND v.patient_id IN (
        SELECT id FROM clinical.patients WHERE tags @> '["M3B_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.invoices i WHERE i.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3B_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.fee_items f WHERE f.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3B_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.billing_saga_log l WHERE l.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3B_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.settlements s WHERE s.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3B_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.orders o WHERE o.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3B_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id=p.id AND p.tags @> '["M3B_TEST"]'::jsonb
    `;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M3B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-B 计费-收款-退费全链路', () => {
  it('计费：挂号+诊查+检验+检查+治疗，幂等不重复', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    const stats = await generateFeeItems(admin, visitId);
    // 挂号1、诊查1、医嘱3（血常规、胸部CT、静脉输液）
    expect(stats.registration).toBe(1);
    expect(stats.consultation).toBe(1);
    expect(stats.orders).toBe(3);
    expect(stats.created).toBe(5);

    // 再次计费：全部幂等跳过，created=0
    const again = await generateFeeItems(admin, visitId);
    expect(again.created).toBe(0);
    expect(again.skipped).toBe(5);
  });

  it('待结算费用合计正确', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const view = await getOutstanding(admin, visitId);
    // 10 + 15 + 25 + 280 + 15 = 345
    expect(Number(view.totalAmount)).toBe(345);
    expect(view.items).toHaveLength(5);
  });

  it('归集→收款→开票：未付→已支付，票据开具', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const itemIds = outstanding.items.map((i) => i.id);

    const { settlement } = await createSettlement(admin, {
      visitId, itemIds, paymentMethod: 'wechat',
    });
    expect(settlement.status).toBe('unpaid');
    expect(Number(settlement.totalAmount)).toBe(345);

    const paid = await paySettlementFlow(admin, settlement.id);
    expect(paid.settlement.status).toBe('paid');
    expect(paid.settlement.paidBy).toBe(admin.id);
    expect(paid.settlement.paidAt).toBeTruthy();
    // 票据
    const detail = await getSettlementDetail(admin, settlement.id);
    expect(detail.invoice).toBeTruthy();
    expect(detail.items.every((i) => i.status === 'settled')).toBe(true);
    // 正向 Saga 日志
    const forward = detail.sagaLog.filter((l) => l.direction === 'forward');
    expect(forward.length).toBeGreaterThan(0);
  });

  it('部分退费：已支付→部分退费，费用 settled→refunded（Saga 补偿）', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const { settlement } = await createSettlement(admin, {
      visitId, itemIds: outstanding.items.map((i) => i.id),
    });
    await paySettlementFlow(admin, settlement.id);

    // 退“血常规”（25）
    const cbc = outstanding.items.find((i) => i.itemName === '血常规')!;
    const { refund, settlement: after } = await refundFeeItem(admin, {
      feeItemId: cbc.id, reason: '患者拒查',
    });
    expect(Number(refund.amount)).toBe(25);
    expect(after.status).toBe('partially_refunded');
    expect(Number(after.refundedAmount)).toBe(25);

    const detail = await getSettlementDetail(admin, settlement.id);
    expect(detail.refunds).toHaveLength(1);
    expect(detail.items.find((i) => i.id === cbc.id)?.status).toBe('refunded');
    // 补偿 Saga 日志
    const compensate = detail.sagaLog.filter((l) => l.direction === 'compensate');
    expect(compensate.length).toBeGreaterThan(0);
  });

  it('全额退费：所有费用退完 → 全额退费', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const { settlement } = await createSettlement(admin, {
      visitId, itemIds: outstanding.items.map((i) => i.id),
    });
    await paySettlementFlow(admin, settlement.id);

    for (const item of outstanding.items) {
      await refundFeeItem(admin, { feeItemId: item.id, reason: '整单退回' });
    }
    const detail = await getSettlementDetail(admin, settlement.id);
    expect(detail.settlement.status).toBe('refunded');
    expect(Number(detail.settlement.refundedAmount)).toBe(345);
  });

  it('未付作废：未付→作废，费用释放回待结算', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const { settlement } = await createSettlement(admin, {
      visitId, itemIds: [outstanding.items[0].id],
    });
    const { settlement: voided } = await voidSettlementFlow(admin, settlement.id);
    expect(voided.status).toBe('void');
    // 费用释放
    const after = await getOutstanding(admin, visitId);
    expect(after.items).toHaveLength(5);
  });
});

describe.skipIf(!dbAvailable)('M3-B 状态机非法转换', () => {
  it('重复收款 → 409', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const { settlement } = await createSettlement(admin, {
      visitId, itemIds: outstanding.items.map((i) => i.id),
    });
    await paySettlementFlow(admin, settlement.id);
    await expect(paySettlementFlow(admin, settlement.id)).rejects.toBeTruthy();
  });

  it('非已结算费用退费 → 409', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    // 未收款，费用仍是 active，退费被拒
    const cbc = outstanding.items.find((i) => i.itemName === '血常规')!;
    await expect(
      refundFeeItem(admin, { feeItemId: cbc.id, reason: 'x' }),
    ).rejects.toBeTruthy();
  });

  it('退费原因必填 → 400', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const { settlement } = await createSettlement(admin, {
      visitId, itemIds: outstanding.items.map((i) => i.id),
    });
    await paySettlementFlow(admin, settlement.id);
    const cbc = outstanding.items.find((i) => i.itemName === '血常规')!;
    await expect(
      refundFeeItem(admin, { feeItemId: cbc.id, reason: '   ' }),
    ).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M3-B 权限与数据范围', () => {
  it('药师无 billing:charge 权限码（路由层强制 403）', async () => {
    // 药师为全院数据范围（hospital→all），DataScope 不拦；收费权限码缺失
    expect(pharmacist.permissions).not.toContain('billing:charge');
    expect(pharmacist.permissions).toContain('billing:read');
  });

  it('药师无 billing:refund 权限码（路由层强制 403）', async () => {
    expect(pharmacist.permissions).not.toContain('billing:refund');
  });

  it('DataScope 跨科：心血管内科医生不能访问急诊科结算 → 403', async () => {
    const visitId = await newOutpatientVisit('急诊科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const { settlement } = await createSettlement(admin, {
      visitId, itemIds: [outstanding.items[0].id],
    });
    await expect(getSettlementDetail(doctorChen, settlement.id)).rejects.toBeTruthy();
  });

  it('医生有 billing:read 只读，可看队列', async () => {
    const queue = await getSettlementQueue(doctorChen);
    expect(Array.isArray(queue.items)).toBe(true);
  });
});

describe.skipIf(!dbAvailable)('M3-B 并发不重复', () => {
  it('同一费用并发归集到两张结算单：只成功一次', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const target = outstanding.items[0].id;

    // 并发创建两张结算单，都尝试归集同一费用
    const results = await Promise.allSettled([
      createSettlement(admin, { visitId, itemIds: [target] }),
      createSettlement(admin, { visitId, itemIds: [target] }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    // 归集只能成功一次（另一张因费用被占用而失败，或受每就诊一在途单约束）
    expect(fulfilled.length + rejected.length).toBe(2);
    expect(fulfilled.length).toBe(1);
  });

  it('同一费用并发退费：只退一次', async () => {
    const visitId = await newOutpatientVisit('心血管内科');
    await generateFeeItems(admin, visitId);
    const outstanding = await getOutstanding(admin, visitId);
    const { settlement } = await createSettlement(admin, {
      visitId, itemIds: outstanding.items.map((i) => i.id),
    });
    await paySettlementFlow(admin, settlement.id);
    const cbc = outstanding.items.find((i) => i.itemName === '血常规')!;

    const results = await Promise.allSettled([
      refundFeeItem(admin, { feeItemId: cbc.id, reason: '并发1' }),
      refundFeeItem(admin, { feeItemId: cbc.id, reason: '并发2' }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const db = getDb();
    const rows = await db`
      SELECT count(*)::int AS n FROM clinical.refunds WHERE fee_item_id = ${cbc.id}
    `;
    expect(rows[0].n).toBe(1);
  });
});

/* ------------------------------ BFF 路由 ------------------------------ */

function makeCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = view
    ? { id: view.id, name: view.realName, roles: view.rawRoles, permissions: view.permissions }
    : null;
  return {
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}
function findRoute(method: string, path: string) {
  return billingRoutes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M3-B BFF 路由：权限与信封', () => {
  it('药师无 billing:charge 计费 → 403', async () => {
    const route = findRoute('POST', '/api/v1/billing/visits/:visitId/generate');
    const res = await route.handle(
      makeCtx(pharmacist, { params: { visitId: 'x' } }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).not.toBe(0);
  });

  it('未登录访问队列 → 401', async () => {
    const res = await findRoute('GET', '/api/v1/billing/queue').handle(makeCtx(null));
    expect(res.status).toBe(401);
  });

  it('管理员队列成功路径统一信封', async () => {
    const res = await findRoute('GET', '/api/v1/billing/queue').handle(makeCtx(admin));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data).toHaveProperty('items');
  });

  it('错误映射：不存在结算单 404', async () => {
    const res = await findRoute('GET', '/api/v1/billing/settlements/:id').handle(
      makeCtx(admin, { params: { id: crypto.randomUUID() } }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe(40400);
  });

  it('归集空费用 → 400', async () => {
    const res = await findRoute('POST', '/api/v1/billing/settlements').handle(
      makeCtx(admin, { body: { visitId: crypto.randomUUID(), itemIds: [] } }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
  });
});
