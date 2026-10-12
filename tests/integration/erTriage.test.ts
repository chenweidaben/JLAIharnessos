/**
 * 健澜科技 jlmedaios - M35-A 急诊五级分诊集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { triageLevel, needsGreenChannel } from '../../src/medical-tools/nursing/erTriage.js';
import { triageView, getTriageView, TriageError } from '../../src/bff/aggregators/erTriageAggregator.js';

describe('纯函数', () => {
  it('SBP<90 → I', () => {
    expect(triageLevel({ systolicBp: 80, chiefComplaint: 'chest pain' })).toBe('I');
  });
  it('SpO2<90 → I', () => {
    expect(triageLevel({ spo2: 85, chiefComplaint: 'dyspnea' })).toBe('I');
  });
  it('正常 → IV', () => {
    expect(triageLevel({ chiefComplaint: 'cough' })).toBe('IV');
  });
  it('绿色通道', () => {
    expect(needsGreenChannel('I')).toBe(true);
    expect(needsGreenChannel('II')).toBe(true);
    expect(needsGreenChannel('IV')).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M35A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '急诊') {
  const patient = await createPatient({
    mrn: `M35A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
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
    await db`DELETE FROM clinical.er_triage_levels r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M35A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M35A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M35A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('急诊分诊（真实 PG）', () => {
  it('I 级自动 green_channel=true', async () => {
    const { visit } = await newPV();
    const r = await triageView(admin, { visitId: visit.id, chiefComplaint: 'cardiac arrest', systolicBp: 70, spo2: 80 });
    expect(r.level).toBe('I');
    expect(r.greenChannel).toBe(true);
  });
  it('IV 级 green_channel=false', async () => {
    const { visit } = await newPV();
    const r = await triageView(admin, { visitId: visit.id, chiefComplaint: 'cough' });
    expect(r.level).toBe('IV');
    expect(r.greenChannel).toBe(false);
  });
  it('GET', async () => {
    const { visit } = await newPV();
    await triageView(admin, { visitId: visit.id, chiefComplaint: 'fever' });
    const g = await getTriageView(admin, visit.id);
    expect(g?.level).toBe('III');
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await triageView(stranger, { visitId: visit.id, chiefComplaint: 'x' }); }
    catch (e) { if (e instanceof TriageError) status = e.status; }
    expect(status).toBe(403);
  });
});
