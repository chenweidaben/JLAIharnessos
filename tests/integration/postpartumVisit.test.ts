/**
 * 健澜科技 jlmedaios - M34-A 产后访视集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { jaundiceElevated, breastfeedingAdequacy } from '../../src/medical-tools/nursing/postpartumVisit.js';
import { recordPostpartumView, listPostpartumView, PostpartumError } from '../../src/bff/aggregators/postpartumVisitAggregator.js';

describe('纯函数', () => {
  it('黄疸按日阈值', () => {
    expect(jaundiceElevated(1, 5)).toBe(false);
    expect(jaundiceElevated(1, 7)).toBe(true);
    expect(jaundiceElevated(2, 8)).toBe(false);
    expect(jaundiceElevated(2, 10)).toBe(true);
    expect(jaundiceElevated(3, 11)).toBe(false);
    expect(jaundiceElevated(3, 13)).toBe(true);
  });
  it('喂养充分度', () => {
    expect(breastfeedingAdequacy(2)).toBe(true);
    expect(breastfeedingAdequacy(1)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M34A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '产科') {
  const patient = await createPatient({
    mrn: `M34A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '女',
    birthDate: '1990-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'postpartum' });
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
    await db`DELETE FROM clinical.postpartum_visits r USING clinical.visits v, clinical.patients p
      WHERE r.mother_visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M34A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M34A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M34A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('产后访视（真实 PG）', () => {
  it('建访视 200；黄疸 elevated 提示', async () => {
    const { visit } = await newPV();
    const r = await recordPostpartumView(admin, { motherVisitId: visit.id, postpartumDay: 1, breastfeedingScore: 2, jaundiceTcb: 8, jaundiceVisual: 'face' });
    expect(r.jaundiceElevated).toBe(true);
    expect(r.referToNICU).toBe(true);
  });
  it('喂养不足提示', async () => {
    const { visit } = await newPV();
    const r = await recordPostpartumView(admin, { motherVisitId: visit.id, postpartumDay: 2, breastfeedingScore: 0 });
    expect(r.breastfeedingAdequate).toBe(false);
  });
  it('列表', async () => {
    const { visit } = await newPV();
    await recordPostpartumView(admin, { motherVisitId: visit.id, postpartumDay: 1, breastfeedingScore: 2 });
    const list = await listPostpartumView(admin, visit.id);
    expect(list.length).toBe(1);
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await recordPostpartumView(stranger, { motherVisitId: visit.id, postpartumDay: 1, breastfeedingScore: 2 }); }
    catch (e) { if (e instanceof PostpartumError) status = e.status; }
    expect(status).toBe(403);
  });
});
