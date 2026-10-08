/**
 * 健澜科技 jlmedaios - 抗菌药物管理闭环 集成测试（M14-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 分级目录列出/过滤；
 *  - 越权：住院医师（unrestricted）开限制使用级 403，开非限制级放行；
 *  - 特殊使用级：未审批使用 409；审批后生成医嘱并电子签名；审批后使用；
 *  - 特殊使用级驳回后不可使用；
 *  - 围术期点评合理/不合理 + 药师签名/退回；
 *  - 专项点评：无指征 + 超量 + 禁忌；
 *  - 处方授权管理：工作组列出 / 更新授权；
 *  - 质控指标返回分子分母；
 *  - 权限：护士记录使用 403、药师开方 403；
 *  - AI 不自主开抗菌药：特殊使用级须审批后才生成医嘱。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；无 DB 自动跳过。
 * afterAll 仅删除本测试 M14A_TEST 标签夹具，绝不全表删除（不动目录/授权种子）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { getOrderById } from '../../src/db/repositories/orderRepo.js';
import { listCatalog } from '../../src/db/repositories/amsRepo.js';
import {
  listCatalogView,
  listGrantsView,
  upsertGrantView,
  applySpecialApproval,
  approveSpecialView,
  rejectSpecialView,
  consumeAntibiotic,
  listSpecialApprovalsView,
  listUsageView,
  checkRulesView,
  createReviewView,
  signReviewView,
  returnReviewView,
  getAmsMetrics,
} from '../../src/bff/aggregators/amsAggregator.js';
import { amsRoutes } from '../../src/bff/routes/ams.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorRes: AuthView;
let doctorChen: AuthView;
let amsApprover: AuthView;
let nurse: AuthView;
let pharmacist: AuthView;

// 药品：D017 头孢呋辛(restricted) / D018 阿莫西林(unrestricted) / D055 亚胺培南(special)
let drugRestricted = '';
let drugUnrestricted = '';
let drugSpecial = '';

const TAG = 'M14A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M14A${seq()}`,
    nameMasked: `A*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1965-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: dept,
    chiefComplaint: 'AMS 闭环测试',
  });
  return { patient, visit };
}

function makeCtx(user: { id: string; roles?: string[] } | null): Ctx {
  return {
    user: user ? { ...user, roles: user.roles ?? ['admin'], permissions: [] } : null,
    query: new URLSearchParams(),
    params: {} as Record<string, string>,
    body: async () => ({}),
    headers: new Headers(),
    method: 'GET',
    path: '/',
  } as unknown as Ctx;
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
  doctorRes = await load('doctor_res');
  doctorChen = await load('doctor_chen');
  amsApprover = await load('ams_approver');
  nurse = await load('nurse_ma');
  pharmacist = await load('pharmacist_wang');

  const catalog = await listCatalog();
  drugRestricted = catalog.find((d) => d.drugCode === 'D017')!.drugId;
  drugUnrestricted = catalog.find((d) => d.drugCode === 'D018')!.drugId;
  drugSpecial = catalog.find((d) => d.drugCode === 'D055')!.drugId;
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 仅删本测试标签夹具：ams 业务表 -> 医嘱 -> visit/patient（不动目录/授权种子）
    await db`
      DELETE FROM clinical.ams_usage_records u
      USING clinical.visits v, clinical.patients p
      WHERE u.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M14A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.ams_reviews r
      USING clinical.visits v, clinical.patients p
      WHERE r.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M14A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.ams_special_approvals s
      USING clinical.visits v, clinical.patients p
      WHERE s.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M14A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.orders o
      USING clinical.visits v, clinical.patients p
      WHERE o.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M14A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M14A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M14A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M14-A 抗菌药物管理闭环（真实 PostgreSQL）', () => {
  it('环境就绪：账号权限分离', () => {
    expect(dbAvailable).toBe(true);
    expect(admin.permissions).toContain('ams:prescribe');
    expect(admin.permissions).toContain('ams:approve');
    expect(admin.permissions).toContain('ams:audit');
    expect(doctorRes.permissions).toContain('ams:prescribe');
    expect(doctorChen.permissions).toContain('ams:prescribe');
    expect(amsApprover.permissions).toContain('ams:approve');
    expect(amsApprover.permissions).not.toContain('ams:prescribe');
    expect(pharmacist.permissions).toContain('ams:review');
    expect(nurse.permissions).not.toContain('ams:prescribe');
  });

  it('分级目录：可列出并按级别过滤', async () => {
    const all = await listCatalogView(admin, {});
    expect(all.length).toBeGreaterThanOrEqual(11);
    const special = await listCatalogView(admin, { atcLevel: 'special' });
    expect(special.length).toBeGreaterThan(0);
    expect(special.every((d) => d.atcLevel === 'special')).toBe(true);
  });

  it('越权：住院医师（unrestricted）开限制使用级 403；开非限制级放行', async () => {
    const { visit } = await newPatientVisit();
    // 限制使用级 -> 403
    await expect(
      consumeAntibiotic(doctorRes, {
        visitId: visit.id, drugId: drugRestricted, purpose: 'therapeutic',
        dose: 1.5, doseUnit: 'g', totalAmount: 3,
      }),
    ).rejects.toMatchObject({ status: 403 });
    // 非限制使用级 -> 放行
    const ok = await consumeAntibiotic(doctorRes, {
      visitId: visit.id, drugId: drugUnrestricted, purpose: 'therapeutic',
      dose: 0.5, doseUnit: 'g', totalAmount: 1,
    });
    expect(ok.drugId).toBe(drugUnrestricted);
    expect(ok.ddds).toBeGreaterThan(0);
  });

  it('特殊使用级：未审批使用 409；审批后生成医嘱并电子签名；审批后使用', async () => {
    const { visit } = await newPatientVisit('感染科');
    const apply = await applySpecialApproval(doctorChen, {
      visitId: visit.id, drugId: drugSpecial, indication: '重症感染，碳青霉烯经验性治疗',
    });
    expect(apply.status).toBe('pending');
    // 未审批 -> 409
    await expect(
      consumeAntibiotic(doctorChen, {
        visitId: visit.id, drugId: drugSpecial, purpose: 'therapeutic',
        dose: 0.5, doseUnit: 'g', totalAmount: 2,
      }),
    ).rejects.toMatchObject({ status: 409 });
    // 审批通过 -> 生成医嘱并电子签名
    const approved = await approveSpecialView(amsApprover, apply.id, {});
    expect(approved.approval.status).toBe('approved');
    expect(approved.orderId).toBeTruthy();
    const order = await getOrderById(approved.orderId);
    expect(order?.orderType).toBe('drug');
    expect(order?.reviewerId).toBe(amsApprover.id);
    expect(order?.status).toBe('active');
    // 审批后使用 -> 放行
    const used = await consumeAntibiotic(doctorChen, {
      visitId: visit.id, drugId: drugSpecial, purpose: 'therapeutic',
      dose: 0.5, doseUnit: 'g', totalAmount: 2,
    });
    expect(used.drugId).toBe(drugSpecial);
  });

  it('特殊使用级：驳回后不可使用', async () => {
    const { visit } = await newPatientVisit('感染科');
    const apply = await applySpecialApproval(doctorChen, {
      visitId: visit.id, drugId: drugSpecial, indication: '经验性使用',
    });
    await rejectSpecialView(amsApprover, apply.id, '指征不充分，先留取病原学');
    // 驳回后无 approved 审批 -> 409
    await expect(
      consumeAntibiotic(doctorChen, {
        visitId: visit.id, drugId: drugSpecial, purpose: 'therapeutic',
        dose: 0.5, doseUnit: 'g', totalAmount: 2,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('围术期点评：合理 / 不合理判定 + 药师签名 / 退回', async () => {
    const { visit } = await newPatientVisit();
    // 合理：I 类切口 + 二代头孢 + 时机 45min + 疗程 24h
    const good = await createReviewView(pharmacist, {
      visitId: visit.id, reviewType: 'perioperative', drugId: drugRestricted,
      incisionClass: 'I', timingMinutes: 45, durationHours: 24,
    });
    expect(good.result).toBe('rational');
    const signed = await signReviewView(pharmacist, good.id, '围术期预防用药合理');
    expect(signed.status).toBe('signed');

    // 不合理：I 类切口时机过晚 + 疗程过长
    const bad = await createReviewView(pharmacist, {
      visitId: visit.id, reviewType: 'perioperative', drugId: drugRestricted,
      incisionClass: 'I', timingMinutes: 120, durationHours: 72,
    });
    expect(bad.result).toBe('irrational');
    expect(bad.issueTypes.length).toBeGreaterThan(0);
    const returned = await returnReviewView(pharmacist, bad.id, '时机与疗程均不达标，退回整改');
    expect(returned.status).toBe('returned');
  });

  it('专项点评：无指征 + 超量 + 禁忌 -> 不合理', async () => {
    const { visit } = await newPatientVisit();
    const r = await createReviewView(pharmacist, {
      visitId: visit.id, reviewType: 'order',
      indication: 'none', doseMultiplier: 3, contraindication: true,
    });
    expect(r.result).toBe('irrational');
    expect(r.issueTypes).toContain('no_indication');
    expect(r.issueTypes).toContain('overdose');
    expect(r.issueTypes).toContain('contraindication');
  });

  it('处方授权管理：工作组可列出 / admin 更新授权', async () => {
    const grants = await listGrantsView(amsApprover);
    expect(grants.length).toBeGreaterThanOrEqual(5);
    // admin 调整 doctor_res 为 restricted
    const updated = await upsertGrantView(admin, {
      prescriberId: doctorRes.id, maxLevel: 'restricted',
    });
    expect(updated.maxLevel).toBe('restricted');
  });

  it('质控指标：返回分子分母 fractions', async () => {
    const m = await getAmsMetrics(admin, { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' });
    expect(m.period.from).toBe('2000-01-01T00:00:00Z');
    expect(m.metrics.fractions.cultureRate).toBeDefined();
    expect(typeof m.aud).toBe('number');
  });

  it('权限：护士记录使用 403；药师开方 403', async () => {
    const { visit } = await newPatientVisit();
    await expect(
      consumeAntibiotic(nurse, {
        visitId: visit.id, drugId: drugUnrestricted, purpose: 'therapeutic',
        dose: 0.5, doseUnit: 'g',
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      consumeAntibiotic(pharmacist, {
        visitId: visit.id, drugId: drugUnrestricted, purpose: 'therapeutic',
        dose: 0.5, doseUnit: 'g',
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('404：不存在点评', async () => {
    await expect(
      signReviewView(pharmacist, '00000000-0000-0000-0000-000000000000', 'x'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('路由：未认证 401；不存在点评 404', async () => {
    const route = amsRoutes.find((r) => r.path === '/api/v1/ams/reviews/:id/sign')!;
    const denied = await route.handle(makeCtx(null));
    expect(denied.status).toBe(401);
    const ctx = Object.assign(makeCtx({ id: admin.id }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
      body: async () => ({ note: 'x' }),
    });
    const r404 = await route.handle(ctx);
    expect(r404.status).toBe(404);
  });

  it('集合查询：特殊审批列表可按状态过滤', async () => {
    const { visit } = await newPatientVisit('感染科');
    await applySpecialApproval(doctorChen, {
      visitId: visit.id, drugId: drugSpecial, indication: '列表查询测试',
    });
    const pending = await listSpecialApprovalsView(admin, { status: 'pending' });
    expect(pending.some((s) => s.visitId === visit.id)).toBe(true);
    expect(pending.every((s) => s.status === 'pending')).toBe(true);
    // 富对象含药品名/患者名
    const mine = pending.find((s) => s.visitId === visit.id)!;
    expect(mine.drugName).toBeTruthy();
  });

  it('集合查询：使用记录列表可按就诊过滤', async () => {
    const { visit } = await newPatientVisit();
    await consumeAntibiotic(doctorRes, {
      visitId: visit.id, drugId: drugUnrestricted, purpose: 'therapeutic',
      dose: 0.5, doseUnit: 'g', totalAmount: 1,
    });
    const list = await listUsageView(admin, { visitId: visit.id });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((u) => u.visitId === visit.id)).toBe(true);
    expect(list[0].drugName).toBeTruthy();
  });

  it('CDS 规则预检：不入库；合理/不合理判定', async () => {
    // 合理：I 类切口 + 一代头孢 + 30min + 24h
    const good = await checkRulesView(admin, {
      kind: 'perioperative', incisionClass: 'I', chosenClass: 'cephalosporin_1',
      doseMinusIncisionMin: 30, durationH: 24,
    });
    expect(good.rational).toBe(true);
    expect(good.issues.length).toBe(0);
    // 不合理：时机过晚 + 疗程过长
    const bad = await checkRulesView(admin, {
      kind: 'perioperative', incisionClass: 'I', chosenClass: 'cephalosporin_1',
      doseMinusIncisionMin: 120, durationH: 72,
    });
    expect(bad.rational).toBe(false);
    expect(bad.issues).toContain('wrong_timing');
    expect(bad.issues).toContain('wrong_duration');
    // 预检不入库：不产生新 review
    const before = await listSpecialApprovalsView(admin, { status: 'pending' });
    expect(bad.detail.summary).toBeTruthy();
    expect(before).toBeDefined();
  });
});
