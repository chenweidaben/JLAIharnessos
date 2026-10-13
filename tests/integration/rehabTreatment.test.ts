/**
 * 健澜科技 jlmedaios - 康复治疗执行集成测试（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  prescribeView, signView, completeView, listView, RehabTreatmentError,
} from '../../src/bff/aggregators/rehabTreatmentAggregator.js';
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
        await sql`DELETE FROM clinical.rehab_treatments WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seedVisit() {
  const patient = await createPatient({
    mrn: `M51${seq()}`, nameMasked: `康*${seq().slice(-4)}`, gender: '男',
    birthDate: '1970-01-01', tags: ['M51_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '心血管内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id, taskIds: [] });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('康复治疗执行（真实 PG）', () => {
  it('admin 权限码在位', () => {
    expect(admin.permissions).toContain('rehab_treatment:manage');
    expect(admin.permissions).toContain('rehab_treatment:view');
  });

  it('开单→签到→填 poor 疗效完成，并自动建 source=rehab 工单', async () => {
    const { visitId } = await seedVisit();
    const prescribed = await prescribeView(admin, { visitId, modality: 'pt', scheduledDate: '2026-10-14' });
    expect(prescribed.status).toBe('prescribed');

    const signed = await signView(admin, prescribed.id);
    expect(signed.status).toBe('signed');

    const { treatment, reviewWorkOrderCreated } = await completeView(admin, prescribed.id, { efficacy: 'poor' });
    expect(treatment.status).toBe('completed');
    expect(treatment.efficacy).toBe('poor');
    expect(reviewWorkOrderCreated).toBe(true);

    const db = getDb();
    const rows = await db`SELECT id FROM clinical.clinical_improvement_tasks WHERE visit_id=${visitId} AND source='rehab'`;
    expect(rows.length).toBe(1);
    cleanup[cleanup.length - 1].taskIds.push(String(rows[0].id));
  });

  it('excellent 疗效不建复评工单', async () => {
    const { visitId } = await seedVisit();
    const prescribed = await prescribeView(admin, { visitId, modality: 'ot', scheduledDate: '2026-10-14' });
    await signView(admin, prescribed.id);
    const { reviewWorkOrderCreated } = await completeView(admin, prescribed.id, { efficacy: 'excellent' });
    expect(reviewWorkOrderCreated).toBe(false);
  });

  it('列表按就诊返回', async () => {
    const { visitId } = await seedVisit();
    await prescribeView(admin, { visitId, modality: 'st', scheduledDate: '2026-10-14' });
    const list = await listView(admin, visitId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 数据范围且非主治）→ 403', async () => {
    const { visitId } = await seedVisit();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000bb', dataScope: 'self' };
    let err: unknown = null;
    try { await prescribeView(outsider, { visitId, modality: 'pt', scheduledDate: '2026-10-14' }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(RehabTreatmentError);
    expect((err as RehabTreatmentError).status).toBe(403);
  });

  it('无 rehab_treatment:manage 权限 → 403', async () => {
    const { visitId } = await seedVisit();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let err: unknown = null;
    try { await prescribeView(noPerm, { visitId, modality: 'pt', scheduledDate: '2026-10-14' }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(RehabTreatmentError);
    expect((err as RehabTreatmentError).status).toBe(403);
  });
});
