/**
 * 健澜科技 jlmedaios - 管路护理 + 非计划拔管集成测试（M17-C）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock），覆盖：
 *  - 正常置入 200；正常 planned 拔管 200；
 *  - unplanned 拔管无 note 400；重复拔管 409；
 *  - 越权 403（doctor 无 tube_care:remove）；NQI 分子分母。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；无 DB 自动跳过。
 * afterAll 仅删除 M17C_TEST 标签夹具，绝不全表删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  getExtubationMetrics,
  insertTubeView,
  removeTubeView,
  TubeCareError,
} from '../../src/bff/aggregators/tubeCareAggregator.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let nurse: AuthView;

const TAG = 'M17C_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M17C${seq()}`,
    nameMasked: `M*${seq().slice(-4)}`,
    gender: '女',
    birthDate: '1970-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: dept,
    chiefComplaint: '管路护理测试',
  });
  return { patient, visit };
}

/** 手动捕获聚合器抛出的 TubeCareError（避免 bun .rejects 在本机挂起）。 */
async function statusOf(p: Promise<unknown>): Promise<number> {
  try {
    await p;
    return 200;
  } catch (e) {
    if (e instanceof TubeCareError) return e.status;
    throw e;
  }
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  doctorChen = await load('doctor_chen');
  nurse = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.tube_assessments a USING clinical.tubes t, clinical.visits v, clinical.patients p
      WHERE a.tube_id = t.id AND t.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.tubes t USING clinical.visits v, clinical.patients p
      WHERE t.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M17C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M17C_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

const describeReal = dbAvailable ? describe : describe.skip;

describeReal('管路护理 + 非计划拔管（真实 PostgreSQL）', () => {
  it('环境就绪：权限分离', () => {
    expect(admin.permissions).toContain('tube_care:insert');
    expect(admin.permissions).toContain('tube_care:remove');
    expect(nurse.permissions).toContain('tube_care:remove');
    expect(doctorChen.permissions).not.toContain('tube_care:remove');
    expect(doctorChen.permissions).toContain('tube_care:read');
  });

  it('正常置入 200', async () => {
    const { visit } = await newPatientVisit();
    const tube = await insertTubeView(nurse, { visitId: visit.id, tubeType: 'urinary_catheter', site: '尿道' });
    expect(tube.status).toBe('in_place');
  });

  it('正常 planned 拔管 200（无需 note）', async () => {
    const { visit } = await newPatientVisit();
    const tube = await insertTubeView(nurse, { visitId: visit.id, tubeType: 'ng_tube' });
    const removed = await removeTubeView(nurse, tube.id, { removalType: 'planned' });
    expect(removed.status).toBe('removed');
    expect(removed.removalType).toBe('planned');
  });

  it('unplanned 拔管无 note 400', async () => {
    const { visit } = await newPatientVisit();
    const tube = await insertTubeView(nurse, { visitId: visit.id, tubeType: 'cvc' });
    const s = await statusOf(removeTubeView(nurse, tube.id, { removalType: 'unplanned' }));
    expect(s).toBe(400);
  });

  it('unplanned 拔管带 note 200', async () => {
    const { visit } = await newPatientVisit();
    const tube = await insertTubeView(nurse, { visitId: visit.id, tubeType: 'cvc' });
    const removed = await removeTubeView(nurse, tube.id, { removalType: 'unplanned', removalNote: '患者意外拽脱' });
    expect(removed.removalType).toBe('unplanned');
    expect(removed.removalNote).toBeTruthy();
  });

  it('重复拔管 409', async () => {
    const { visit } = await newPatientVisit();
    const tube = await insertTubeView(nurse, { visitId: visit.id, tubeType: 'chest_drain' });
    await removeTubeView(nurse, tube.id, { removalType: 'planned' });
    const s = await statusOf(removeTubeView(nurse, tube.id, { removalType: 'planned' }));
    expect(s).toBe(409);
  });

  it('doctor 无 remove 权限 403', async () => {
    const { visit } = await newPatientVisit();
    const tube = await insertTubeView(nurse, { visitId: visit.id, tubeType: 'ng_tube' });
    const s = await statusOf(removeTubeView(doctorChen, tube.id, { removalType: 'planned' }));
    expect(s).toBe(403);
  });

  it('NQI 分子分母计算', async () => {
    const m = await getExtubationMetrics(nurse);
    expect(typeof m.metrics.rate).toBe('number');
    expect(m.metrics.fractions.rate.denominator).toBeGreaterThanOrEqual(0);
    expect(m.metrics.fractions.rate.numerator).toBeGreaterThanOrEqual(0);
  });
});
