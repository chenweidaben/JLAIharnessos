/**
 * 健澜科技 jlmedaios - 患者满意度集成测试（M63-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  listSurveyView, rankingView, submitSurveyView, SurveyError,
} from '../../src/bff/aggregators/satisfactionSurveyAggregator.js';
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
        await sql`DELETE FROM clinical.satisfaction_surveys WHERE id=${c.surveyId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `SA${seq()}`, nameMasked: `满*${seq().slice(-4)}`, gender: '女',
    birthDate: '1960-01-01', tags: ['M63_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '呼吸科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('患者满意度聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('satisfaction:view');
  });

  it('提交问卷 200', async () => {
    const { patientId, visitId } = await seed();
    const s = await submitSurveyView(admin, {
      visitId, patientId, medicalScore: 5, nursingScore: 4, logisticsScore: 3, environmentScore: 4,
      department: '呼吸科', comment: 'ok',
    });
    expect(s.medicalScore).toBe(5);
    expect(s.nursingScore).toBe(4);
    cleanup.push({ patientId, visitId, surveyId: s.id });
  });

  it('科室排名聚合', async () => {
    const r = await rankingView(admin);
    expect(Array.isArray(r.ranks)).toBe(true);
    expect(typeof r.overallAvg).toBe('number');
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000ee', dataScope: 'self' };
    let code = 200;
    try { await listSurveyView(outsider, visitId); }
    catch (e) { code = e instanceof SurveyError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listSurveyView(noPerm, visitId); }
    catch (e) { code = e instanceof SurveyError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
