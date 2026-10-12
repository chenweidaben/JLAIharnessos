/**
 * 健澜科技 jlmedaios - M32-A 护士屏手术麻醉块集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';
import { getVisitEvaluations, EvalError } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';

describe('纯函数', () => {
  it('手术麻醉摘要', () => {
    const s = buildEvalSummary({
      surgery: { preopComplete: false, preopMissing: ['npo'], pacuAldrete: 5, pacuReady: false, followupPending: 2, anesthesiaOpenTasks: 1 },
    });
    expect(s.surgery.preopComplete).toBe(false);
    expect(s.surgery.followupPending).toBe(2);
    expect(s.needsAttention).toBe(true);
    expect(s.flags).toContain('preop_incomplete');
  });
  it('无手术块默认安全', () => {
    const s = buildEvalSummary({});
    expect(s.surgery.pacuAldrete).toBeNull();
    expect(s.needsAttention).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M32A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M32A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1965-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'eval' });
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
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M32A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M32A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('手术麻醉块（真实 PG）', () => {
  it('evaluations 返回 surgery 块字段', async () => {
    const { visit } = await newPV();
    const out = await getVisitEvaluations(admin, visit.id);
    expect(out.summary ?? out.summary).toBeTruthy();
    expect(out.summary.surgery).toBeTruthy();
    expect(out.summary.surgery.followupPending).toBe(0);
    expect(Array.isArray(out.followups)).toBe(true);
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await getVisitEvaluations(stranger, visit.id); }
    catch (e) { if (e instanceof EvalError) status = e.status; }
    expect(status).toBe(403);
  });
});
