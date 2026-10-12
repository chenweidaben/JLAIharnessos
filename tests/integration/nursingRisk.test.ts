/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警闭环 集成测试（M17-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - Braden 压疮高危 / Morse 跌倒高危评估、自动分层、建议性预防草稿、预警；
 *  - 预防状态机 suggested -> accepted -> executed（护士本人签名，联动护理任务）、重复执行 409；
 *  - 高危看板：无 executed 预防预警，执行后消除；
 *  - 结局事件登记（皮肤结局/跌倒）+ NQI 指标分子分母；
 *  - 权限分离：医生评估、护士执行、护士登记事件；越权 403、未登录 401、不存在 404。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；无 DB 自动跳过。
 * afterAll 仅删除本测试 M17A_TEST 标签夹具，绝不全表删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  assessRisk,
  getHighRiskBoard,
  getVisitDetail,
  acceptPreventionView,
  executePreventionView,
  recordEventView,
  getRiskMetrics,
} from '../../src/bff/aggregators/nursingRiskAggregator.js';
import { nursingRiskRoutes } from '../../src/bff/routes/nursingRisk.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let nurse: AuthView;

const TAG = 'M17A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M17A${seq()}`,
    nameMasked: `R*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1965-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: dept,
    chiefComplaint: '护理风险预警闭环测试',
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
    await db`
      DELETE FROM clinical.nursing_risk_events e
      USING clinical.visits v, clinical.patients p
      WHERE e.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.nursing_risk_preventions pr
      USING clinical.nursing_risk_assessments a, clinical.visits v, clinical.patients p
      WHERE pr.assessment_id = a.id AND a.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.nursing_risk_assessments a
      USING clinical.visits v, clinical.patients p
      WHERE a.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.nursing_tasks t
      USING clinical.visits v, clinical.patients p
      WHERE t.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M17A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M17A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M17-A 压疮/跌倒风险预警闭环（真实 PostgreSQL）', () => {  it('环境就绪：账号权限分离', () => {
    expect(dbAvailable).toBe(true);
    expect(admin.permissions).toContain('nursing_risk:read');
    expect(admin.permissions).toContain('nursing_risk:assess');
    expect(admin.permissions).toContain('nursing_risk:execute');
    expect(doctorChen.permissions).toContain('nursing_risk:assess');
    expect(doctorChen.permissions).not.toContain('nursing_risk:execute');
    expect(nurse.permissions).toContain('nursing_risk:execute');
    expect(nurse.permissions).not.toContain('nursing_risk:assess');
  });

  it('压疮高危评估：Braden=6 -> high，生成 suggested 草稿 + 预警', async () => {
    // doctor_chen 属心血管内科，夹具须建在本科室（dataScope=department）
    const { visit } = await newPatientVisit('心血管内科');
    const r = await assessRisk(doctorChen, {
      visitId: visit.id,
      riskType: 'pressure_ulcer',
      items: { sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 },
    });
    expect(r.assessment.totalScore).toBe(6);
    expect(r.assessment.level).toBe('high');
    expect(r.suggestedPreventions.length).toBeGreaterThan(0);
    expect(r.suggestedPreventions.every((p) => p.status === 'suggested')).toBe(true);
    expect(r.warning.warning).toBe(true);
  });

  it('跌倒高危评估：Morse=60 -> high', async () => {
    const { visit } = await newPatientVisit('心血管内科');
    const r = await assessRisk(doctorChen, {
      visitId: visit.id,
      riskType: 'fall',
      items: { fallHistory: 25, multipleDiagnoses: 15, ambulationAid: 0, ivTherapy: 20, gait: 0, mentalStatus: 0 },
    });
    expect(r.assessment.totalScore).toBe(60);
    expect(r.assessment.level).toBe('high');
  });

  it('预防状态机：suggested -> accepted -> executed（护士本人签名），重复执行 409', async () => {
    // 护士马丽属急诊科：admin(dataScope=all) 在急诊科建评估，护士本科室执行签名
    const { visit } = await newPatientVisit('急诊科');
    const a = await assessRisk(admin, {
      visitId: visit.id,
      riskType: 'pressure_ulcer',
      items: { sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 },
    });
    const prev = a.suggestedPreventions[0];
    // 护士确认
    const accepted = await acceptPreventionView(nurse, prev.id);
    expect(accepted.status).toBe('accepted');
    // 未签名执行 -> 400
    let e400: any = null;
    try { await executePreventionView(nurse, prev.id, {}); } catch (e: any) { e400 = e; }
    expect(e400?.status).toBe(400);
    // 本人签名执行
    const ex = await executePreventionView(nurse, prev.id, { signature: '护士马丽签名' });
    expect(ex.prevention.status).toBe('executed');
    expect(ex.prevention.signature).toBe('护士马丽签名');
    expect(ex.nursingTaskId).toBeTruthy();
    // 重复执行 -> 409（手动 catch，规避 bun .rejects 对 DB 后抛错的挂起）
    let repErr: any = null;
    try { await executePreventionView(nurse, prev.id, { signature: 'x' }); } catch (e: any) { repErr = e; }
    expect(repErr?.status).toBe(409);
  });

  it('高危看板：无 executed 预警；执行后消除', async () => {
    const { visit } = await newPatientVisit('急诊科');
    const a = await assessRisk(admin, {
      visitId: visit.id,
      riskType: 'fall',
      items: { fallHistory: 25, multipleDiagnoses: 15, ambulationAid: 0, ivTherapy: 20, gait: 0, mentalStatus: 0 },
    });
    let board = await getHighRiskBoard(admin);
    let mine = board.find((b) => b.assessment.visitId === visit.id && b.assessment.riskType === 'fall');
    expect(mine).toBeDefined();
    expect(mine!.warning.warning).toBe(true);
    // 护士（急诊科）确认+执行后
    await acceptPreventionView(nurse, a.suggestedPreventions[0].id);
    await executePreventionView(nurse, a.suggestedPreventions[0].id, { signature: '护士马丽签名' });
    const detail = await getVisitDetail(admin, visit.id);
    expect(detail.warnings.length).toBe(0);
  });

  it('结局事件登记 + NQI 指标分子分母', async () => {
    const { visit } = await newPatientVisit('急诊科');
    await assessRisk(admin, {
      visitId: visit.id,
      riskType: 'pressure_ulcer',
      items: { sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 },
    });
    const ev = await recordEventView(nurse, {
      visitId: visit.id,
      eventType: 'pressure_injury_stage2',
      description: '骶尾部二期压力性损伤',
    });
    expect(ev.eventType).toBe('pressure_injury_stage2');
    expect(ev.riskType).toBe('pressure_ulcer');
    const m = await getRiskMetrics(admin, { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' });
    expect(m.totalVisits).toBeGreaterThan(0);
    // 至少有 1 例压疮事件
    expect(m.metrics.fractions.pressureInjuryRate.numerator).toBeGreaterThan(0);
  });

  it('权限：护士评估 403；医生执行 403；不存在就诊 404', async () => {
    const { visit } = await newPatientVisit('急诊科');
    // 护士无 nursing_risk:assess（权限先于数据范围校验）
    let e1: any = null;
    try { await assessRisk(nurse, { visitId: visit.id, riskType: 'fall', items: { fallHistory: 25 } }); } catch (e: any) { e1 = e; }
    expect(e1?.status).toBe(403);
    const a = await assessRisk(admin, {
      visitId: visit.id, riskType: 'fall',
      items: { fallHistory: 25, multipleDiagnoses: 15, ambulationAid: 0, ivTherapy: 20, gait: 0, mentalStatus: 0 },
    });
    // 医生无 nursing_risk:execute
    let e2: any = null;
    try { await acceptPreventionView(doctorChen, a.suggestedPreventions[0].id); } catch (e: any) { e2 = e; }
    expect(e2?.status).toBe(403);
    // 不存在就诊（admin dataScope=all，越权不拦截，落 404）
    let e3: any = null;
    try {
      await assessRisk(doctorChen, { visitId: '00000000-0000-0000-0000-000000000000', riskType: 'fall', items: { fallHistory: 0 } });
    } catch (e: any) { e3 = e; }
    expect(e3?.status).toBe(404);
  });

  it('路由：未认证 401；不存在评估 404', async () => {
    const denied = await nursingRiskRoutes[0].handle(makeCtx(null));
    expect(denied.status).toBe(401);
    const detailCtx = Object.assign(makeCtx({ id: admin.id }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    const route = nursingRiskRoutes.find((r) => r.path === '/api/v1/nursing-risk/assessments/:id')!;
    const r404 = await route.handle(detailCtx);
    expect(r404.status).toBe(404);
  });
});
