/**
 * 健澜科技 jlmedaios - 入院营养风险筛查集成测试（M29-A）
 *
 * 纯函数：总分/年龄加分/风险判定。
 * 真实 PG：建筛查200、>=3分risk=true、<3分false、越权403、无权限403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { assessNutrition, ageBonus } from '../../src/medical-tools/nursing/nutritionScreening.js';
import {
  createScreeningView,
  listScreeningsView,
  NutritionError,
} from '../../src/bff/aggregators/nutritionScreeningAggregator.js';

// ---------- 纯函数 ----------
describe('NRS-2002 纯函数', () => {
  it('年龄>=70 加 1 分', () => {
    expect(ageBonus(69)).toBe(0);
    expect(ageBonus(70)).toBe(1);
    expect(ageBonus(85)).toBe(1);
  });
  it('总分=营养+疾病+年龄加分，>=3 为风险', () => {
    const r1 = assessNutrition({ nutritionScore: 1, diseaseSeverity: 1, ageYears: 50 });
    expect(r1.totalScore).toBe(2);
    expect(r1.nutritionRisk).toBe(false);
    const r2 = assessNutrition({ nutritionScore: 2, diseaseSeverity: 1, ageYears: 75 });
    expect(r2.totalScore).toBe(4);
    expect(r2.ageBonus).toBe(1);
    expect(r2.nutritionRisk).toBe(true);
  });
});

// ---------- 集成 ----------
let dbAvailable = false;
let admin: AuthView;
let nurse: AuthView;
let stranger: AuthView;

const TAG = 'M29A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M29A${seq()}`,
    nameMasked: `M*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1950-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: '营养筛查测试',
  });
  return { patient, visit };
}

async function statusOf(p: Promise<unknown>): Promise<number> {
  try { await p; return 200; } catch (e) {
    if (e instanceof NutritionError) return e.status;
    throw e;
  }
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch { dbAvailable = false; }
if (dbAvailable) {
  const load = async (u: string): Promise<AuthView> => {
    const user = await getUserByUsername(u);
    if (!user) throw new Error(`缺账号 ${u}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  nurse = await load('nurse_ma');
  stranger = await load('doctor_lin');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.nutrition_screenings r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M29A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M29A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M29A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

const describeReal = dbAvailable ? describe : describe.skip;

describeReal('营养风险筛查（真实 PostgreSQL）', () => {
  it('权限：护士有 screen/view，admin 有', () => {
    expect(nurse.permissions).toContain('nutrition:screen');
    expect(nurse.permissions).toContain('nutrition:view');
    expect(admin.permissions).toContain('nutrition:screen');
  });

  it('>=3 分 risk=true，<3 分 false', async () => {
    const { visit } = await newPatientVisit();
    const high = await createScreeningView(nurse, { visitId: visit.id, nutritionScore: 2, diseaseSeverity: 1, ageYears: 75 });
    expect(high.totalScore).toBe(4);
    expect(high.nutritionRisk).toBe(true);
    expect(high.advice).toContain('营养科');
    const low = await createScreeningView(nurse, { visitId: visit.id, nutritionScore: 0, diseaseSeverity: 0, ageYears: 40 });
    expect(low.totalScore).toBe(0);
    expect(low.nutritionRisk).toBe(false);
  });

  it('列出就诊筛查记录', async () => {
    const { visit } = await newPatientVisit();
    await createScreeningView(nurse, { visitId: visit.id, nutritionScore: 1, diseaseSeverity: 1, ageYears: 50 });
    const list = await listScreeningsView(nurse, visit.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权 403（非本科室护士）', async () => {
    const { visit } = await newPatientVisit('骨科');
    const s = await statusOf(createScreeningView(stranger, { visitId: visit.id, nutritionScore: 1, diseaseSeverity: 1, ageYears: 50 }));
    expect(s).toBe(403);
  });
});
