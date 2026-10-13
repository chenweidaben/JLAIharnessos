/**
 * 健澜科技 jlmedaios - 疼痛门诊集成测试（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { recordView, listView, PainClinicError } from '../../src/bff/aggregators/painClinicAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string; taskIds: string[] }[] = [];

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
        for (const tid of c.taskIds) {
          await sql`DELETE FROM clinical.clinical_improvement_tasks WHERE id=${tid}`;
        }
        await sql`DELETE FROM clinical.pain_clinic_records WHERE patient_id=${c.patientId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seedPatient() {
  const patient = await createPatient({
    mrn: `M52${seq()}`, nameMasked: `痛*${seq().slice(-4)}`, gender: '女',
    birthDate: '1965-01-01', tags: ['M52_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '肿瘤内科',
    chiefComplaint: '癌痛', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id, taskIds: [] });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('疼痛门诊（真实 PG）', () => {
  it('admin 权限码在位', () => {
    expect(admin.permissions).toContain('pain_clinic:manage');
    expect(admin.permissions).toContain('pain_clinic:view');
  });

  it('登记 NRS>=7 自动建 source=pain 工单', async () => {
    const { patientId } = await seedPatient();
    const { record, escalationWorkOrderCreated } = await recordView(admin, {
      patientId, baselineNrs: 9, currentNrs: 8, breakthroughCount: 0, analgesic: '奥施康定',
    });
    expect(record.currentNrs).toBe(8);
    expect(record.adjustmentSuggestion).toContain('加量');
    expect(escalationWorkOrderCreated).toBe(true);
    const db = getDb();
    const rows = await db`SELECT id FROM clinical.clinical_improvement_tasks WHERE visit_id IS NULL AND source='pain' AND created_by=${admin.id}`;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    cleanup[cleanup.length - 1].taskIds.push(String(rows[0].id));
  });

  it('NRS=3 不建工单', async () => {
    const { patientId } = await seedPatient();
    const before = cleanup.length - 1;
    const { escalationWorkOrderCreated } = await recordView(admin, {
      patientId, baselineNrs: 5, currentNrs: 3, breakthroughCount: 1, analgesic: '塞来昔布',
    });
    expect(escalationWorkOrderCreated).toBe(false);
    expect(cleanup[before].taskIds.length).toBe(0);
  });

  it('列表按患者返回', async () => {
    const { patientId } = await seedPatient();
    await recordView(admin, { patientId, baselineNrs: 6, currentNrs: 4, analgesic: '吗啡' });
    const list = await listView(admin, patientId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 数据范围且非主治）→ 403', async () => {
    const { patientId } = await seedPatient();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000cc', dataScope: 'self' };
    let err: unknown = null;
    try { await recordView(outsider, { patientId, baselineNrs: 6, currentNrs: 4, analgesic: '吗啡' }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(PainClinicError);
    expect((err as PainClinicError).status).toBe(403);
  });

  it('无 pain_clinic:manage 权限 → 403', async () => {
    const { patientId } = await seedPatient();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let err: unknown = null;
    try { await recordView(noPerm, { patientId, baselineNrs: 6, currentNrs: 4, analgesic: '吗啡' }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(PainClinicError);
    expect((err as PainClinicError).status).toBe(403);
  });
});
