/**
 * 健澜科技 jlmedaios - M31-C 术后镇痛随访集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { buildSchedule, isOverdue, shouldEscalate } from '../../src/medical-tools/nursing/postopFollowup.js';
import { scheduleView, listView, completeView, FollowupError } from '../../src/bff/aggregators/postopFollowupAggregator.js';

describe('纯函数', () => {
  it('三时间点', () => {
    const end = new Date('2026-01-01T00:00:00Z');
    const s = buildSchedule(end);
    expect(s.length).toBe(3);
    expect(s[0].timepoint).toBe('6h');
  });
  it('超期', () => {
    const due = new Date(Date.now() - 1000);
    expect(isOverdue(due, new Date())).toBe(true);
  });
  it('升级', () => {
    expect(shouldEscalate(3)).toBe(false);
    expect(shouldEscalate(5)).toBe(true);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M31C_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M31C${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1965-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'postop' });
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
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='pain' AND visit_id IN (
      SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON v.patient_id=p.id WHERE p.tags @> '["M31C_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.postop_pain_followups r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M31C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M31C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M31C_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('术后随访（真实 PG）', () => {
  it('建计划 3 条', async () => {
    const { visit } = await newPV();
    const list = await scheduleView(admin, visit.id, new Date(Date.now() - 3600000).toISOString());
    expect(list.length).toBe(3);
  });
  it('完成随访记 score；>=4 自动建工单', async () => {
    const { visit } = await newPV();
    await scheduleView(admin, visit.id, new Date(Date.now() - 3600000).toISOString());
    const done = await completeView(admin, visit.id, '6h', 7);
    expect(done.painScore).toBe(7);
    expect(done.workOrderId).toBeTruthy();
    const low = await completeView(admin, visit.id, '24h', 2);
    expect(low.workOrderId).toBeNull();
  });
  it('列表', async () => {
    const { visit } = await newPV();
    await scheduleView(admin, visit.id, new Date().toISOString());
    const list = await listView(admin, visit.id);
    expect(list.length).toBe(3);
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await scheduleView(stranger, visit.id, new Date().toISOString()); }
    catch (e) { if (e instanceof FollowupError) status = e.status; }
    expect(status).toBe(403);
  });
});
