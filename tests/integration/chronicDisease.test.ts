/**
 * 健澜科技 jlmedaios - M39-A 慢病随访集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { hypertensionControl, diabetesControl, abnormalLevel } from '../../src/medical-tools/nursing/chronicDisease.js';
import { createPlanView, recordVitalsView, ChronicError } from '../../src/bff/aggregators/chronicDiseaseAggregator.js';

describe('纯函数', () => {
  it('高血压达标', () => {
    expect(hypertensionControl(120, 80)).toBe(true);
    expect(hypertensionControl(150, 95)).toBe(false);
    expect(abnormalLevel('hypertension', 190, 110)).toBe('critical');
  });
  it('糖尿病达标', () => {
    expect(diabetesControl(6.0, 6.5)).toBe(true);
    expect(diabetesControl(9.0, 8.0)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M39A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatient() {
  return createPatient({
    mrn: `M39A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1960-01-01', tags: [TAG],
  });
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const load = async (u: string) => {
    const user = await getUserByUsername(u);
    if (!user) throw new Error(`缺 ${u}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin'); stranger = await load('doctor_lin');
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='chronic' AND patient_id IN (
      SELECT id FROM clinical.patients WHERE tags @> '["M39A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.chronic_vitals WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M39A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.chronic_followup_plans WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M39A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M39A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('慢病随访（真实 PG）', () => {
  it('建计划 200', async () => {
    const p = await newPatient();
    const r = await createPlanView(admin, { patientId: p.id, disease: 'hypertension', nextFollowupAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    expect(r.disease).toBe('hypertension');
  });
  it('血压达标 level=controlled', async () => {
    const p = await newPatient();
    const r = await recordVitalsView(admin, { patientId: p.id, sbp: 120, dbp: 80 });
    expect(r.level).toBe('controlled');
  });
  it('血压未达标自动建 source=chronic 工单', async () => {
    const p = await newPatient();
    const r = await recordVitalsView(admin, { patientId: p.id, sbp: 160, dbp: 95 });
    expect(r.level).toBe('abnormal');
    expect(r.interventionTaskId).toBeTruthy();
  });
  it('越权 403（无 chronic:manage 权限）', async () => {
    const p = await newPatient();
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await recordVitalsView(fake, { patientId: p.id, sbp: 120, dbp: 80 });
    } catch (e) { if (e instanceof ChronicError) status = e.status; }
    expect(status).toBe(403);
  });
});
