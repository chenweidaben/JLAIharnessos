/**
 * 健澜科技 jlmedaios - 复诊号源预约集成测试（M62-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection, withTx } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { bookView, cancelView, listView, recommendView, FollowupApptError } from '../../src/bff/aggregators/followupApptAggregator.js';
import { planView } from '../../src/bff/aggregators/dischargePlanAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string }[] = [];
const createdScheduleIds: string[] = [];

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => {
  if (dbAvailable) {
    await execTestCleanup(async (sql) => {
      for (const sid of createdScheduleIds) {
        await sql`DELETE FROM clinical.appointment_slots WHERE schedule_id=${sid}`;
        await sql`DELETE FROM clinical.doctor_schedules WHERE id=${sid}`;
      }
      for (const c of cleanup) {
        await sql`DELETE FROM clinical.followup_appointments WHERE discharge_plan_id IN (SELECT id FROM clinical.discharge_plans WHERE visit_id=${c.visitId})`;
        await sql`DELETE FROM clinical.discharge_plans WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `FA${seq()}`, nameMasked: `复*${seq().slice(-4)}`, gender: '男',
    birthDate: '1955-01-01', tags: ['M62_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '内分泌科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

async function seedSlot(dept: string) {
  const day = `2027-01-${String(1 + (createdScheduleIds.length * 2) + Math.floor(Math.random() * 2)).padStart(2, '0')}`;
  return withTx(async (tx) => {
    const sch = await tx`
      INSERT INTO clinical.doctor_schedules (doctor_id, department, work_date)
      VALUES (${admin.id}, ${dept}, ${day}) RETURNING id`;
    const sid = String((sch[0] as { id: string }).id);
    createdScheduleIds.push(sid);
    await tx`
      INSERT INTO clinical.appointment_slots (schedule_id, slot_start, slot_end, total_quota, booked_count)
      VALUES (${sid}, ${day + ' 09:00+08'}, ${day + ' 09:30+08'}, 5, 0)`;
    return { sid, date: day };
  });
}

const D = dbAvailable ? describe : describe.skip;

D('复诊号源预约聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('followup_appt:book');
    expect(admin.permissions).toContain('followup_appt:view');
  });

  it('推荐号源并一键预约 200', async () => {
    const { visitId } = await seed();
    const plan = await planView(admin, { visitId, medicationSummary: 'x', followupDepartment: '内分泌科' });
    const slot = await seedSlot('内分泌科');
    const rec = await recommendView(admin, plan.plan.id);
    expect(rec.options.length).toBeGreaterThan(0);
    const booked = await bookView(admin, plan.plan.id, slot.sid, slot.date, '内分泌科');
    expect(booked.status).toBe('booked');
  });

  it('重复预约冲突 400', async () => {
    const { visitId } = await seed();
    const plan = await planView(admin, { visitId, medicationSummary: 'x', followupDepartment: '内分泌科' });
    const slot = await seedSlot('内分泌科');
    await bookView(admin, plan.plan.id, slot.sid, slot.date, '内分泌科');
    let code = 200;
    try { await bookView(admin, plan.plan.id, slot.sid, slot.date, '内分泌科'); }
    catch (e) { code = e instanceof FollowupApptError ? e.status : 500; }
    expect(code).toBe(400);
  });

  it('取消 -> cancelled', async () => {
    const { visitId } = await seed();
    const plan = await planView(admin, { visitId, medicationSummary: 'x', followupDepartment: '内分泌科' });
    const slot = await seedSlot('内分泌科');
    const booked = await bookView(admin, plan.plan.id, slot.sid, slot.date, '内分泌科');
    const cancelled = await cancelView(admin, booked.id);
    expect(cancelled.status).toBe('cancelled');
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000dd', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, visitId); }
    catch (e) { code = e instanceof FollowupApptError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, visitId); }
    catch (e) { code = e instanceof FollowupApptError ? e.status : 500; }
    expect(code).toBe(403);
  });
});


