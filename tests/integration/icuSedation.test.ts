/**
 * 健澜科技 jlmedaios - M33-A ICU RASS 镇静评分集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { rassLevel, withinTarget, overSedated } from '../../src/medical-tools/nursing/icuSedation.js';
import { recordSedationView, listSedationView, SedationError } from '../../src/bff/aggregators/icuSedationAggregator.js';

describe('纯函数', () => {
  it('分级', () => {
    expect(rassLevel(-5)).toBe('unarousable');
    expect(rassLevel(0)).toBe('alert_calm');
    expect(rassLevel(4)).toBe('combative');
  });
  it('达标 ±1', () => {
    expect(withinTarget(-1, -1)).toBe(true);
    expect(withinTarget(-2, -1)).toBe(true);
    expect(withinTarget(0, -1)).toBe(true);
    expect(withinTarget(2, -1)).toBe(false);
  });
  it('过深 ≤-3', () => {
    expect(overSedated(-3)).toBe(true);
    expect(overSedated(-1)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M33A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = 'ICU') {
  const patient = await createPatient({
    mrn: `M33A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1955-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'icu' });
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
    await db`DELETE FROM clinical.icu_sedation_records r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M33A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M33A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M33A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('ICU 镇静（真实 PG）', () => {
  it('建记录 200；达标', async () => {
    const { visit } = await newPV();
    const r = await recordSedationView(admin, { visitId: visit.id, rassScore: -1 });
    expect(r.rassScore).toBe(-1);
    expect(r.inTarget).toBe(true);
    expect(r.overSedated).toBe(false);
  });
  it('过深提示', async () => {
    const { visit } = await newPV();
    const r = await recordSedationView(admin, { visitId: visit.id, rassScore: -4, targetRass: -1 });
    expect(r.overSedated).toBe(true);
    expect(r.inTarget).toBe(false);
  });
  it('列表', async () => {
    const { visit } = await newPV();
    await recordSedationView(admin, { visitId: visit.id, rassScore: 0 });
    const list = await listSedationView(admin, visit.id);
    expect(list.length).toBe(1);
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await recordSedationView(stranger, { visitId: visit.id, rassScore: 0 }); }
    catch (e) { if (e instanceof SedationError) status = e.status; }
    expect(status).toBe(403);
  });
});
