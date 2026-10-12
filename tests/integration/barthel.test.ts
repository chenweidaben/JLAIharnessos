/**
 * 健澜科技 jlmedaios - M35-B Barthel ADL 集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { barthelTotal, barthelLevel } from '../../src/medical-tools/nursing/barthelAdl.js';
import { recordBarthelView, listBarthelView, BarthelError } from '../../src/bff/aggregators/barthelAggregator.js';

describe('纯函数', () => {
  it('总分', () => {
    expect(barthelTotal({ feeding: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toileting: 10, transfer: 15, walking: 15, stairs: 10 })).toBe(100);
    expect(barthelTotal({ feeding: 0, bathing: 0, grooming: 0, dressing: 0, bowel: 0, bladder: 0, toileting: 0, transfer: 0, walking: 0, stairs: 0 })).toBe(0);
  });
  it('五档分级', () => {
    expect(barthelLevel(100)).toBe('independent');
    expect(barthelLevel(80)).toBe('mild');
    expect(barthelLevel(50)).toBe('moderate');
    expect(barthelLevel(30)).toBe('severe');
    expect(barthelLevel(10)).toBe('total');
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M35B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '康复科') {
  const patient = await createPatient({
    mrn: `M35B${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1970-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'rehab' });
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
    await db`DELETE FROM clinical.barthel_assessments a USING clinical.visits v, clinical.patients p
      WHERE a.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M35B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M35B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M35B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('Barthel（真实 PG）', () => {
  it('建评定 200、总分落库', async () => {
    const { visit } = await newPV();
    const r = await recordBarthelView(admin, {
      visitId: visit.id,
      feeding: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toileting: 10, transfer: 15, walking: 15, stairs: 10,
    });
    expect(r.totalScore).toBe(100);
    expect(r.dependencyLevel).toBe('independent');
  });
  it('分级正确（30 分 severe）', async () => {
    const { visit } = await newPV();
    const r = await recordBarthelView(admin, {
      visitId: visit.id,
      feeding: 5, bathing: 0, grooming: 0, dressing: 5, bowel: 5, bladder: 5, toileting: 5, transfer: 5, walking: 0, stairs: 0,
    });
    expect(r.totalScore).toBe(30);
    expect(r.dependencyLevel).toBe('severe');
  });
  it('列表', async () => {
    const { visit } = await newPV();
    await recordBarthelView(admin, {
      visitId: visit.id,
      feeding: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toileting: 10, transfer: 15, walking: 15, stairs: 10,
    });
    const g = await listBarthelView(admin, visit.id);
    expect(g.length).toBe(1);
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await recordBarthelView(stranger, {
      visitId: visit.id,
      feeding: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toileting: 10, transfer: 15, walking: 15, stairs: 10,
    }); } catch (e) { if (e instanceof BarthelError) status = e.status; }
    expect(status).toBe(403);
  });
});
