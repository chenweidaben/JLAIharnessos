/**
 * 健澜科技 jlmedaios - M30-A 护理评估汇总集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';
import { getVisitEvaluations, EvalError } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';

let dbAvailable = false;
let nurse: AuthView;
let stranger: AuthView;
const TAG = 'M30A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M30A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '女',
    birthDate: '1990-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'eval' });
  return { patient, visit };
}

describe('纯函数 buildEvalSummary', () => {
  it('无异常 needsAttention=false', () => {
    const s = buildEvalSummary({ openTaskCount: 0 });
    expect(s.needsAttention).toBe(false);
  });
  it('营养风险触发 flag', () => {
    const s = buildEvalSummary({ nutrition: { totalScore: 4, nutritionRisk: true } });
    expect(s.needsAttention).toBe(true);
    expect(s.flags).toContain('nutrition_risk');
  });
});

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const load = async (u: string) => {
    const user = await getUserByUsername(u);
    if (!user) throw new Error(`缺 ${u}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  nurse = await load('nurse_ma'); stranger = await load('doctor_lin');
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M30A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M30A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('护理评估汇总（真实 PG）', () => {
  it('权限码在位', () => {
    expect(nurse.permissions).toContain('nurse_eval:view');
  });
  it('正常返回各模块卡片字段', async () => {
    const { visit } = await newPV();
    const r = await getVisitEvaluations(nurse, visit.id);
    expect(r.visitId).toBe(visit.id);
    expect(r.summary).toBeTruthy();
    expect(Array.isArray(r.summary.flags)).toBe(true);
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await getVisitEvaluations(stranger, visit.id); } catch (e) {
      if (e instanceof EvalError) status = e.status;
    }
    expect(status).toBe(403);
  });
});
