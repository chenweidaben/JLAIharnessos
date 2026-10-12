/**
 * 健澜科技 jlmedaios - M41-A 肿瘤随访集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { ctcaeSeverity, isSevere } from '../../src/medical-tools/nursing/oncologyFollowup.js';
import { createCycleView, recordAdverseView, OncologyError } from '../../src/bff/aggregators/oncologyAggregator.js';

describe('纯函数', () => {
  it('CTCAE 分级', () => {
    expect(ctcaeSeverity(3)).toBe('severe');
    expect(ctcaeSeverity(1)).toBe('mild');
    expect(isSevere(3)).toBe(true);
    expect(isSevere(1)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M41A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatient() {
  return createPatient({ mrn: `M41A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男', birthDate: '1960-01-01', tags: [TAG] });
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) admin = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.chemo_adverse_events WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M41A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='oncology' AND patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M41A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.chemo_cycles WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M41A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M41A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('肿瘤随访（真实 PG）', () => {
  it('建周期 200', async () => {
    const p = await newPatient();
    const r = await createCycleView(admin, { patientId: p.id, drugName: 'cisplatin', cycleNo: 1, plannedDate: '2026-10-14' });
    expect(r.drugName).toBe('cisplatin');
  });
  it('grade3 自动建 source=oncology 工单', async () => {
    const p = await newPatient();
    const c = await createCycleView(admin, { patientId: p.id, drugName: 'cisplatin', cycleNo: 1, plannedDate: '2026-10-14' });
    const r = await recordAdverseView(admin, { cycleId: c.id, patientId: p.id, term: 'neutropenia', grade: 3 });
    expect(r.taskId).toBeTruthy();
  });
  it('grade1 不建工单', async () => {
    const p = await newPatient();
    const c = await createCycleView(admin, { patientId: p.id, drugName: 'cisplatin', cycleNo: 1, plannedDate: '2026-10-14' });
    const r = await recordAdverseView(admin, { cycleId: c.id, patientId: p.id, term: 'nausea', grade: 1 });
    expect(r.taskId).toBeNull();
  });
  it('越权 403', async () => {
    const p = await newPatient();
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await createCycleView(fake, { patientId: p.id, drugName: 'x', cycleNo: 1, plannedDate: '2026-10-14' });
    } catch (e) { if (e instanceof OncologyError) status = e.status; }
    expect(status).toBe(403);
  });
});
