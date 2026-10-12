/**
 * 健澜科技 jlmedaios - M37-A 急诊绿色通道超时催办集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { isOverdue } from '../../src/medical-tools/nursing/erGreenEscalation.js';
import { triageView } from '../../src/bff/aggregators/erTriageAggregator.js';
import { scanAndEscalate, listOverdue, ErGreenError } from '../../src/bff/aggregators/erGreenEscalationAggregator.js';

describe('纯函数', () => {
  it('I 级 >10min', () => {
    const now = new Date();
    expect(isOverdue('I', new Date(now.getTime() - 15 * 60000), now)).toBe(true);
    expect(isOverdue('I', new Date(now.getTime() - 5 * 60000), now)).toBe(false);
  });
  it('II 级 >30min', () => {
    const now = new Date();
    expect(isOverdue('II', new Date(now.getTime() - 40 * 60000), now)).toBe(true);
    expect(isOverdue('II', new Date(now.getTime() - 20 * 60000), now)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M37A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '急诊') {
  const patient = await createPatient({
    mrn: `M37A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1980-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'emergency', department: dept, chiefComplaint: 'er' });
  return { patient, visit };
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
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='er_green' AND visit_id IN (
      SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON v.patient_id=p.id WHERE p.tags @> '["M37A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.er_triage_levels r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M37A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M37A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M37A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('绿色通道超时（真实 PG）', () => {
  it('扫描：I 级超时建单', async () => {
    const { visit } = await newPV();
    await triageView(admin, { visitId: visit.id, chiefComplaint: 'cardiac arrest', systolicBp: 70 });
    const db = getDb();
    await db`UPDATE clinical.er_triage_levels SET created_at = now() - interval '20 minutes' WHERE visit_id=${visit.id}`;
    const { created } = await scanAndEscalate(admin);
    expect(created).toBeGreaterThanOrEqual(1);
  });
  it('幂等：重复扫描不重复建', async () => {
    const r1 = await scanAndEscalate(admin);
    const r2 = await scanAndEscalate(admin);
    expect(r1.created).toBeGreaterThanOrEqual(0);
    expect(r2.created).toBe(0);
  });
  it('listOverdue', async () => {
    const list = await listOverdue(admin);
    expect(Array.isArray(list)).toBe(true);
  });
  it('越权 403（无 er_triage:view 权限）', async () => {
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await scanAndEscalate(fake);
    } catch (e) { if (e instanceof ErGreenError) status = e.status; }
    expect(status).toBe(403);
  });
});
