/**
 * 健澜科技 jlmedaios - 满意度提醒集成测试（M64-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection, withTx } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { myPendingView, scanView, ReminderError } from '../../src/bff/aggregators/satisfactionReminderAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string; surveyId: string }[] = [];

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => {
  if (dbAvailable) {
    await execTestCleanup(async (sql) => {
      for (const c of cleanup) {
        await sql`DELETE FROM clinical.patient_notifications WHERE ref_id=${c.surveyId}`;
        await sql`DELETE FROM clinical.satisfaction_surveys WHERE id=${c.surveyId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seedSurvey(daysAgo: number, stage: string) {
  const patient = await createPatient({
    mrn: `SR${seq()}`, nameMasked: `提*${seq().slice(-4)}`, gender: '女',
    birthDate: '1970-01-01', tags: ['M64_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '呼吸科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  const created = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const survey = await withTx(async (tx) => {
    const rows = await tx`
      INSERT INTO clinical.satisfaction_surveys
        (survey_no, patient_id, visit_id, source_type, overall_score,
         medical_score, service_score, environment_score, process_score, wait_score,
         nursing_score, logistics_score, department, reminder_stage, created_at, submitted_by)
      VALUES (${'SR' + seq()}, ${patient.id}, ${visit.id}, 'inpatient', 4,
              5, 4, 4, 3, 5, 4, 3, '呼吸科', ${stage}, ${created}, ${admin.id})
      RETURNING id`;
    return String((rows[0] as { id: string }).id);
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id, surveyId: survey });
  return { patientId: patient.id, visitId: visit.id, surveyId: survey };
}

const D = dbAvailable ? describe : describe.skip;

D('满意度提醒聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('satisfaction:notify');
  });

  it('出院 3 天扫描建 first 通知', async () => {
    const s = await seedSurvey(3, 'none');
    const r = await scanView(admin);
    expect(r.pushed).toBeGreaterThanOrEqual(1);
    const mine = await myPendingView({ ...admin, id: s.patientId });
    expect(mine.items.length).toBeGreaterThanOrEqual(1);
  });

  it('已 first_sent 且出院 7 天 -> second 推送', async () => {
    const s = await seedSurvey(7, 'first_sent');
    const r = await scanView(admin);
    expect(r.pushed).toBeGreaterThanOrEqual(1);
  });

  it('幂等：连续两次扫描第二次不重复推同一条', async () => {
    await seedSurvey(4, 'none');
    const r1 = await scanView(admin);
    const r2 = await scanView(admin);
    expect(r1.pushed).toBeGreaterThanOrEqual(1);
    expect(r2.pushed).toBe(0);
  });

  it('越权（无权限码）-> 403', async () => {
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await scanView(noPerm); }
    catch (e) { code = e instanceof ReminderError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
