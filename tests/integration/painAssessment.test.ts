/**
 * 健澜科技 jlmedaios - 疼痛评估集成测试（M29-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { painLevel, needAnalgesia, reassessIntervalHours } from '../../src/medical-tools/nursing/painAssessment.js';
import { createAssessmentView, listAssessmentsView, PainError } from '../../src/bff/aggregators/painAssessmentAggregator.js';

describe('NRS 纯函数', () => {
  it('分级', () => {
    expect(painLevel(2)).toBe('mild');
    expect(painLevel(5)).toBe('moderate');
    expect(painLevel(8)).toBe('severe');
  });
  it('>=4 需镇痛', () => {
    expect(needAnalgesia(3)).toBe(false);
    expect(needAnalgesia(4)).toBe(true);
    expect(needAnalgesia(9)).toBe(true);
  });
  it('再评估间隔', () => {
    expect(reassessIntervalHours('admission', 9)).toBe(1);
    expect(reassessIntervalHours('admission', 5)).toBe(4);
    expect(reassessIntervalHours('postop', 2)).toBe(8);
  });
});

let dbAvailable = false;
let admin: AuthView;
let nurse: AuthView;
let stranger: AuthView;
const TAG = 'M29B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M29B${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '女',
    birthDate: '1980-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'pain test' });
  return { patient, visit };
}
async function statusOf(p: Promise<unknown>): Promise<number> {
  try { await p; return 200; } catch (e) { if (e instanceof PainError) return e.status; throw e; }
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const load = async (u: string) => {
    const user = await getUserByUsername(u);
    if (!user) throw new Error(`缺 ${u}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin'); nurse = await load('nurse_ma'); stranger = await load('doctor_lin');
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.pain_assessments r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M29B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M29B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M29B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('疼痛评估（真实 PG）', () => {
  it('权限', () => {
    expect(nurse.permissions).toContain('pain:assess');
    expect(nurse.permissions).toContain('pain:view');
  });
  it('>=4 镇痛建议，<4 无', async () => {
    const { visit } = await newPV();
    const severe = await createAssessmentView(nurse, { visitId: visit.id, score: 8, assessType: 'cancer' });
    expect(severe.level).toBe('severe');
    expect(severe.needAnalgesia).toBe(true);
    const mild = await createAssessmentView(nurse, { visitId: visit.id, score: 2, assessType: 'admission' });
    expect(mild.needAnalgesia).toBe(false);
  });
  it('列表', async () => {
    const { visit } = await newPV();
    await createAssessmentView(nurse, { visitId: visit.id, score: 3, assessType: 'admission' });
    const list = await listAssessmentsView(nurse, visit.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    const s = await statusOf(createAssessmentView(stranger, { visitId: visit.id, score: 3, assessType: 'admission' }));
    expect(s).toBe(403);
  });
});
