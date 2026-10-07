/**
 * 健澜科技 jlmedaios - VTE 智能防治闭环 集成测试（M13-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - Caprini 极高危 / Padua 高危评估、自动分层、建议性预防草稿、预警；
 *  - 出血高危：药物确认 409 拦截，显式 override 放行；
 *  - 机械预防护士执行（落护理任务）、药物预防医师确认（生成医嘱并电子签名）；
 *  - 高危看板 mismatch 提醒、结局记录、质控指标；
 *  - 权限分离：医生评估/确认、护士执行、越权 403、未登录 401、不存在 404；
 *  - AI 不自主开抗凝药：评估只产生 suggested，确认才生成医嘱。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；无 DB 自动跳过。
 * afterAll 仅删除本测试 M13A_TEST 标签夹具，绝不全表删除。
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
import {
  assessVte,
  getHighRiskBoard,
  getVisitDetail,
  confirmPharmacological,
  executeMechanical,
  recordOutcomeView,
  getVteMetrics,
} from '../../src/bff/aggregators/vteAggregator.js';
import { vteRoutes } from '../../src/bff/routes/vte.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let nurse: AuthView;

const TAG = 'M13A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M13A${seq()}`,
    nameMasked: `V*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1965-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: dept,
    chiefComplaint: 'VTE 防治闭环测试',
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
  doctorChen = await load('doctor_chen');
  nurse = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 仅删本测试标签夹具：vte 三表 -> 关联医嘱/护理任务 -> visit/patient
    await db`
      DELETE FROM clinical.vte_outcomes o
      USING clinical.visits v, clinical.patients p
      WHERE o.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M13A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.vte_preventions pr
      USING clinical.visits v, clinical.patients p
      WHERE pr.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M13A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.vte_assessments a
      USING clinical.visits v, clinical.patients p
      WHERE a.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M13A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.orders o
      USING clinical.visits v, clinical.patients p
      WHERE o.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M13A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.nursing_tasks t
      USING clinical.visits v, clinical.patients p
      WHERE t.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M13A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M13A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M13A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe('M13-A VTE 智能防治闭环（真实 PostgreSQL）', () => {
  it('环境就绪：账号权限分离', () => {
    expect(dbAvailable).toBe(true);
    expect(admin.permissions).toContain('vte:read');
    expect(admin.permissions).toContain('vte:assess');
    expect(admin.permissions).toContain('vte:prevent');
    expect(admin.permissions).toContain('vte:execute');
    expect(admin.permissions).toContain('vte:audit');
    expect(doctorChen.permissions).toContain('vte:assess');
    expect(doctorChen.permissions).toContain('vte:prevent');
    expect(doctorChen.permissions).not.toContain('vte:execute');
    expect(nurse.permissions).toContain('vte:execute');
    expect(nurse.permissions).not.toContain('vte:assess');
    expect(nurse.permissions).not.toContain('vte:prevent');
  });

  it('Caprini 极高危评估：自动分层 + 建议性预防草稿 + 预警', async () => {
    const { visit } = await newPatientVisit();
    // 年龄61-74(2)+大手术>45min(2)+活动肿瘤(2) = 6 => very_high
    const r = await assessVte(doctorChen, {
      visitId: visit.id, scale: 'caprini', occasion: 'admission',
      vteFactorKeys: ['age_61_74', 'major_surgery_gt45min', 'active_cancer'],
      bleedingFactorKeys: [],
    });
    expect(r.assessment.vteScore).toBe(6);
    expect(r.assessment.vteLevel).toBe('very_high');
    expect(r.assessment.alertRaised).toBe(true);
    // AI 只生成 suggested 草稿：机械(ipc) + 药物(lmwh)
    expect(r.suggestedPreventions.some((p) => p.category === 'mechanical' && p.method === 'ipc')).toBe(true);
    const ph = r.suggestedPreventions.find((p) => p.category === 'pharmacological');
    expect(ph?.method).toBe('lmwh');
    expect(ph?.status).toBe('suggested');
    // 尚无 confirmed/executed => mismatch 提醒
    expect(r.warning.mismatch).toBe(true);
  });

  it('Padua 高危评估：level=high，生成药物建议', async () => {
    const { visit } = await newPatientVisit('呼吸内科');
    // 活动肿瘤(3)+卧床>=3天(3) = 6 => high
    const r = await assessVte(doctorChen, {
      visitId: visit.id, scale: 'padua', occasion: 'admission',
      vteFactorKeys: ['active_cancer', 'bedridden_ge3d'],
      bleedingFactorKeys: [],
    });
    expect(r.assessment.vteLevel).toBe('high');
    expect(r.suggestedPreventions.some((p) => p.category === 'pharmacological')).toBe(true);
  });

  it('机械预防：护士执行 suggested -> executed，落护理任务', async () => {
    const { visit } = await newPatientVisit();
    const a = await assessVte(doctorChen, {
      visitId: visit.id, scale: 'caprini', occasion: 'postop',
      vteFactorKeys: ['age_41_60', 'minor_surgery'],
      bleedingFactorKeys: [],
    });
    // caprini score=2 => medium，仅机械 ipc 草稿
    const mech = a.suggestedPreventions.find((p) => p.category === 'mechanical');
    expect(mech).toBeDefined();
    const ex = await executeMechanical(nurse, mech!.id);
    expect(ex.prevention.status).toBe('executed');
    expect(ex.nursingTaskId).toBeTruthy();
  });

  it('药物预防：医师确认生成 drug 医嘱并电子签名', async () => {
    const { visit } = await newPatientVisit();
    const a = await assessVte(doctorChen, {
      visitId: visit.id, scale: 'caprini', occasion: 'postop',
      vteFactorKeys: ['age_ge75', 'major_surgery_gt45min', 'active_cancer'],
      bleedingFactorKeys: [],
    });
    const ph = a.suggestedPreventions.find((p) => p.category === 'pharmacological')!;
    const r = await confirmPharmacological(doctorChen, ph.id, {});
    expect(r.prevention.status).toBe('confirmed');
    expect(r.orderId).toBeTruthy();
    const order = await getOrderById(r.orderId);
    expect(order?.orderType).toBe('drug');
    // 电子签名：reviewer_id 已写入，医嘱 active
    expect(order?.reviewerId).toBe(doctorChen.id);
    expect(order?.status).toBe('active');
  });

  it('出血高危：药物确认默认 409 拦截，override 后放行', async () => {
    const { visit } = await newPatientVisit();
    const a = await assessVte(doctorChen, {
      visitId: visit.id, scale: 'padua', occasion: 'admission',
      vteFactorKeys: ['active_cancer', 'bedridden_ge3d'],
      bleedingFactorKeys: ['active_bleeding', 'thrombocytopenia'],
    });
    expect(a.assessment.bleedingLevel).toBe('high');
    const ph = a.suggestedPreventions.find((p) => p.category === 'pharmacological')!;
    // 无 override => 409
    await expect(confirmPharmacological(doctorChen, ph.id, {})).rejects.toMatchObject({ status: 409 });
    // 有 override + 原因 => 放行
    const r = await confirmPharmacological(doctorChen, ph.id, {
      override: true, overrideReason: '权衡血栓获益大于出血风险，医师床旁确认',
    });
    expect(r.prevention.status).toBe('confirmed');
  });

  it('高危看板：mismatch 提醒；干预后消除', async () => {
    const { visit } = await newPatientVisit();
    const a = await assessVte(doctorChen, {
      visitId: visit.id, scale: 'caprini', occasion: 'admission',
      vteFactorKeys: ['age_ge75', 'major_surgery_gt45min'],
      bleedingFactorKeys: [],
    });
    const board = await getHighRiskBoard(admin);
    const mine = board.find((b) => b.assessment.visitId === visit.id);
    expect(mine).toBeDefined();
    expect(mine!.mismatch.mismatch).toBe(true);
    // 确认药物预防后，再查详情 mismatch 消除
    const ph = a.suggestedPreventions.find((p) => p.category === 'pharmacological')!;
    await confirmPharmacological(doctorChen, ph.id, {});
    const detail = await getVisitDetail(admin, visit.id);
    expect(detail.warning.mismatch).toBe(false);
  });

  it('结局记录 + 质控指标聚合', async () => {
    const { visit } = await newPatientVisit();
    await assessVte(doctorChen, {
      visitId: visit.id, scale: 'padua', occasion: 'admission',
      vteFactorKeys: ['active_cancer', 'bedridden_ge3d'],
      bleedingFactorKeys: [],
    });
    const out = await recordOutcomeView(doctorChen, {
      visitId: visit.id, eventType: 'dvt', source: 'hospital_acquired',
      description: '左下肢深静脉血栓',
    });
    expect(out.eventType).toBe('dvt');
    const m = await getVteMetrics(admin, { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' });
    expect(m.totalVisits).toBeGreaterThan(0);
    expect(m.metrics.fractions.assessmentRate.denominator).toBe(m.totalVisits);
  });

  it('权限：护士确认药物 403；医生执行机械 403；护士评估 403', async () => {
    const { visit } = await newPatientVisit();
    const a = await assessVte(doctorChen, {
      visitId: visit.id, scale: 'caprini', occasion: 'postop',
      vteFactorKeys: ['age_ge75', 'major_surgery_gt45min'],
      bleedingFactorKeys: [],
    });
    const ph = a.suggestedPreventions.find((p) => p.category === 'pharmacological')!;
    const mech = a.suggestedPreventions.find((p) => p.category === 'mechanical')!;
    // 护士无 vte:prevent
    await expect(confirmPharmacological(nurse, ph.id, {})).rejects.toMatchObject({ status: 403 });
    // 医生无 vte:execute
    await expect(executeMechanical(doctorChen, mech.id)).rejects.toMatchObject({ status: 403 });
    // 护士无 vte:assess
    await expect(
      assessVte(nurse, { visitId: visit.id, scale: 'padua', occasion: 'admission', vteFactorKeys: [], bleedingFactorKeys: [] }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('404：不存在就诊评估', async () => {
    await expect(
      assessVte(doctorChen, {
        visitId: '00000000-0000-0000-0000-000000000000', scale: 'padua', occasion: 'admission',
        vteFactorKeys: [], bleedingFactorKeys: [],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('路由：未认证 401；不存在评估 404', async () => {
    const denied = await vteRoutes[0].handle(makeCtx(null));
    expect(denied.status).toBe(401);
    const detailCtx = Object.assign(makeCtx({ id: admin.id }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    // 找 assessments/:id 路由
    const route = vteRoutes.find((r) => r.path === '/api/v1/vte/assessments/:id')!;
    const r404 = await route.handle(detailCtx);
    expect(r404.status).toBe(404);
  });
});
