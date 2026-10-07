/**
 * 健澜科技 jlmedaios - 临床用血质量闭环 集成测试（M10-B）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 输血疗效评估：显效/部分有效/无效/无法判定、手动录入、幂等、未完成 409；
 *  - 用血合理性评价：合理/基本合理/不合理、人工确认指征；
 *  - 等级评审质控指标聚合；
 *  - 权限：医师评估、输血科/医务科审核分离，越权 403；
 *  - 详情与 BFF 路由信封。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具并还原库存。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createLabResult } from '../../src/db/repositories/labResultRepo.js';
import { getTransfusionByRequest } from '../../src/db/repositories/transfusionRepo.js';
import {
  applyTransfusion,
  crossmatch,
  dispense,
  startTransfusion,
  completeTransfusion,
} from '../../src/bff/aggregators/transfusionAggregator.js';
import {
  assessEfficacy,
  reviewUtilization,
  getQualityMetrics,
  getBloodQualityDetail,
} from '../../src/bff/aggregators/bloodQualityAggregator.js';
import { bloodQualityRoutes } from '../../src/bff/routes/bloodQuality.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let nurse: AuthView;

const TAG = 'M10B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

/**
 * 本测试专用的 O型红细胞批次（与全局血库库存隔离）。
 * expiry_date 设为 2027 年（晚于全局批次 2026 年），确保 M10-A 等并行测试
 * 按 FEFO 自动选批时不会误扣本批次；本测试通过 batchNo 显式指定发本批次。
 */
const M10B_BATCH = 'M10B-RC-O-TEST';
const M10B_BATCH_UNITS = 100;

function applyBody(visitId: string, patientId: string, overrides: Record<string, unknown> = {}) {
  return {
    requestNo: `BQ${seq()}`,
    visitId,
    patientId,
    department: '普外科',
    indication: '重度贫血 Hb 65 g/L',
    indicationMeta: { hb: 65 },
    bloodType: 'O',
    component: 'red_cell',
    unitCount: 2,
    urgency: 'routine',
    ...overrides,
  };
}

async function newPatientVisit() {
  const patient = await createPatient({
    mrn: `M10B${seq()}`,
    nameMasked: `质*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1970-01-01',
    tags: [TAG],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: '普外科',
    chiefComplaint: '输血及质量评价',
  });
  return { patient, visit };
}

/** 跑完申请→配血→发血→输注→完成，返回 req/transfusion 等。 */
async function setupCompleted(applyOverrides: Record<string, unknown> = {}) {
  const { patient, visit } = await newPatientVisit();
  const body = applyBody(visit.id, patient.id, applyOverrides);
  const { req } = await applyTransfusion(doctorChen, body);
  await crossmatch(req.id, admin, { result: '相合' });
  await dispense(req.id, admin, { batchNo: M10B_BATCH });
  await startTransfusion(req.id, nurse, { coSignBy: admin.id });
  await completeTransfusion(req.id, nurse);
  const transfusion = await getTransfusionByRequest(req.id);
  return { patient, visit, req, transfusion: transfusion! };
}

async function addLab(
  visitId: string,
  patientId: string,
  itemCode: string,
  itemName: string,
  numeric: number | null,
  unit: string | null,
  resultTime: string,
  text?: string,
) {
  return createLabResult({
    visitId, patientId, itemCode, itemName,
    numericValue: numeric, value: text ?? null, unit, resultTime,
  });
}

/** 插入输血前 6 项（HGB 由疗效基线单独提供）。 */
async function addPreTests(visitId: string, patientId: string, baseTime: number) {
  const t = new Date(baseTime - 3600_000).toISOString();
  await addLab(visitId, patientId, 'ABO', 'ABO血型', null, null, t, 'A型 RhD阳性');
  await addLab(visitId, patientId, 'HBsAg', '乙肝表面抗原', null, null, t, '阴性');
  await addLab(visitId, patientId, 'HCV', '丙肝抗体', null, null, t, '阴性');
  await addLab(visitId, patientId, 'HIV', 'HIV抗体', null, null, t, '阴性');
  await addLab(visitId, patientId, 'TPPA', '梅毒螺旋体抗体', null, null, t, '阴性');
  await addLab(visitId, patientId, 'PT', '凝血酶原时间', 12, 's', t);
}

function makeCtx(user: { id: string; roles?: string[] } | null): Ctx {
  return {
    user: user ? { ...user, roles: user.roles ?? ['admin'], permissions: [] } : null,
    query: new URLSearchParams(),
    params: {} as Record<string, string>,
    body: async () => ({}),
    headers: new Headers(),
    method: 'GET',
    path: '/',
  } as unknown as Ctx;
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

  // 创建本测试专用的 O型红细胞批次（不修改全局库存）；幂等，重跑不重复
  const db0 = getDb();
  await db0`
    INSERT INTO clinical.blood_stock (blood_type, component, batch_no, units, expiry_date)
    VALUES ('O', 'red_cell', ${M10B_BATCH}, ${M10B_BATCH_UNITS}, '2027-12-31')
    ON CONFLICT (blood_type, component, batch_no) DO NOTHING`;
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 删除本测试专用批次（未触碰全局库存，故无需重置）
    await db`
      DELETE FROM clinical.blood_stock WHERE batch_no = ${M10B_BATCH}`;
    await db`
      DELETE FROM clinical.transfusion_efficacy_assessments e
      USING clinical.patients p
      WHERE e.patient_id = p.id AND p.tags @> '["M10B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.blood_utilization_reviews u
      USING clinical.patients p
      WHERE u.patient_id = p.id AND p.tags @> '["M10B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.blood_transfusion_reactions r
      USING clinical.blood_transfusions t, clinical.blood_transfusion_requests b,
            clinical.visits v, clinical.patients p
      WHERE r.transfusion_id = t.id AND t.request_id = b.id
        AND b.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M10B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.blood_transfusions t
      USING clinical.blood_transfusion_requests b, clinical.visits v, clinical.patients p
      WHERE t.request_id = b.id AND b.visit_id = v.id AND v.patient_id = p.id
        AND p.tags @> '["M10B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.blood_transfusion_requests b
      USING clinical.visits v, clinical.patients p
      WHERE b.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M10B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.lab_results l
      USING clinical.patients p
      WHERE l.patient_id = p.id AND p.tags @> '["M10B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M10B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M10B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe('M10-B 用血质量闭环（真实 PostgreSQL）', () => {
  it('环境就绪：账号权限分离', () => {
    expect(dbAvailable).toBe(true);
    expect(admin.permissions).toContain('blood:assess');
    expect(admin.permissions).toContain('blood:audit');
    expect(doctorChen.permissions).toContain('blood:assess');
    expect(doctorChen.permissions).not.toContain('blood:audit');
    expect(nurse.permissions).not.toContain('blood:assess');
    expect(nurse.permissions).not.toContain('blood:audit');
  });

  it('疗效评估：红细胞 65→86 显效', async () => {
    const { patient, visit, req, transfusion } = await setupCompleted();
    const start = new Date(String(transfusion.start_at)).getTime();
    const end = new Date(String(transfusion.end_at)).getTime();
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 65, 'g/L', new Date(start - 3600_000).toISOString());
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 86, 'g/L', new Date(end + 2 * 3600_000).toISOString());
    await addPreTests(visit.id, patient.id, start);
    const r = await assessEfficacy(doctorChen, { requestId: req.id });
    expect(r.assessment.efficacyGrade).toBe('effective');
    expect(r.created).toBe(true);
    expect(r.assessment.actualDelta).toBe(21);
  });

  it('疗效评估：部分有效', async () => {
    const { patient, visit, req, transfusion } = await setupCompleted();
    const start = new Date(String(transfusion.start_at)).getTime();
    const end = new Date(String(transfusion.end_at)).getTime();
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 65, 'g/L', new Date(start - 3600_000).toISOString());
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 75, 'g/L', new Date(end + 2 * 3600_000).toISOString());
    const r = await assessEfficacy(doctorChen, { requestId: req.id });
    expect(r.assessment.efficacyGrade).toBe('partial');
  });

  it('疗效评估：无效', async () => {
    const { patient, visit, req, transfusion } = await setupCompleted();
    const start = new Date(String(transfusion.start_at)).getTime();
    const end = new Date(String(transfusion.end_at)).getTime();
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 65, 'g/L', new Date(start - 3600_000).toISOString());
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 63, 'g/L', new Date(end + 2 * 3600_000).toISOString());
    const r = await assessEfficacy(doctorChen, { requestId: req.id });
    expect(r.assessment.efficacyGrade).toBe('ineffective');
  });

  it('疗效评估：缺复查无法判定', async () => {
    const { patient, visit, req, transfusion } = await setupCompleted();
    const start = new Date(String(transfusion.start_at)).getTime();
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 65, 'g/L', new Date(start - 3600_000).toISOString());
    const r = await assessEfficacy(doctorChen, { requestId: req.id });
    expect(r.assessment.efficacyGrade).toBe('indeterminate');
  });

  it('疗效评估：手动录入数值', async () => {
    const { req } = await setupCompleted();
    const r = await assessEfficacy(doctorChen, {
      requestId: req.id, manualPre: 60, manualPost: 82,
    });
    expect(r.assessment.efficacyGrade).toBe('effective');
    expect(r.assessment.preResultId).toBeNull();
  });

  it('疗效评估：幂等，重复评估更新不新建', async () => {
    const { req } = await setupCompleted();
    const first = await assessEfficacy(doctorChen, {
      requestId: req.id, manualPre: 60, manualPost: 70,
    });
    expect(first.created).toBe(true);
    const second = await assessEfficacy(doctorChen, {
      requestId: req.id, manualPre: 60, manualPost: 85,
    });
    expect(second.created).toBe(false);
    expect(second.assessment.id).toBe(first.assessment.id);
    expect(second.assessment.efficacyGrade).toBe('effective');
  });

  it('疗效评估：输注未完成 409', async () => {
    const { patient, visit } = await newPatientVisit();
    const body = applyBody(visit.id, patient.id, { unitCount: 1 });
    const { req } = await applyTransfusion(doctorChen, body);
    await expect(
      assessEfficacy(doctorChen, { requestId: req.id, manualPre: 60, manualPost: 80 }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('合理性评价：指征合规+检测完整+剂量合理 → 合理', async () => {
    const { patient, visit, req, transfusion } = await setupCompleted();
    const start = new Date(String(transfusion.start_at)).getTime();
    const end = new Date(String(transfusion.end_at)).getTime();
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 65, 'g/L', new Date(start - 3600_000).toISOString());
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 86, 'g/L', new Date(end + 2 * 3600_000).toISOString());
    await addPreTests(visit.id, patient.id, start);
    const r = await reviewUtilization(admin, { requestId: req.id });
    expect(r.review.conclusion).toBe('rational');
    expect(r.created).toBe(true);
  });

  it('合理性评价：无指征 → 不合理', async () => {
    const { req } = await setupCompleted({
      indication: '患者要求输血',
      indicationMeta: { hb: 120 },
    });
    const r = await reviewUtilization(admin, { requestId: req.id });
    expect(r.review.conclusion).toBe('irrational');
    expect(r.review.indicationCompliant).toBe(false);
  });

  it('合理性评价：指征合规但缺输血前检测 → 基本合理', async () => {
    const { req } = await setupCompleted();
    const r = await reviewUtilization(admin, { requestId: req.id });
    expect(r.review.conclusion).toBe('largely');
    expect(r.review.preTestComplete).toBe(false);
  });

  it('合理性评价：人工确认指征（急诊）', async () => {
    const { req } = await setupCompleted({
      indication: '急诊抢救',
      indicationMeta: {},
      urgency: 'emergency',
    });
    const r = await reviewUtilization(admin, {
      requestId: req.id,
      manualIndication: true,
      conclusionNote: '车祸失血性休克，抢救时未留检验，有手术记录佐证',
    });
    // 指征人工确认；但缺检测，仍为基本合理
    expect(r.review.indicationCompliant).toBe(true);
    expect(r.review.conclusion).toBe('largely');
  });

  it('权限：医师做合理性审核 403；护士评估疗效 403', async () => {
    const { req } = await setupCompleted();
    await expect(
      reviewUtilization(doctorChen, { requestId: req.id }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      assessEfficacy(nurse, { requestId: req.id, manualPre: 60, manualPost: 80 }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('质控指标：周期内聚合', async () => {
    const { patient, visit, req, transfusion } = await setupCompleted();
    const start = new Date(String(transfusion.start_at)).getTime();
    const end = new Date(String(transfusion.end_at)).getTime();
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 65, 'g/L', new Date(start - 3600_000).toISOString());
    await addLab(visit.id, patient.id, 'HGB', '血红蛋白', 86, 'g/L', new Date(end + 2 * 3600_000).toISOString());
    await addPreTests(visit.id, patient.id, start);
    await assessEfficacy(doctorChen, { requestId: req.id });
    await reviewUtilization(admin, { requestId: req.id });
    const r = await getQualityMetrics(admin, {
      from: '2000-01-01T00:00:00Z',
      to: '2100-01-01T00:00:00Z',
    });
    expect(r.totalRequests).toBeGreaterThan(0);
    expect(r.metrics.componentTransfusionRate).toBeGreaterThan(0);
    expect(r.metrics.efficacyAssessmentRate).toBeGreaterThan(0);
  });

  it('详情：聚合申请/输注/疗效/评价', async () => {
    const { req } = await setupCompleted({ unitCount: 1 });
    const d = await getBloodQualityDetail(req.id);
    expect(d.req.id).toBe(req.id);
    expect(d.transfusion).not.toBeNull();
  });

  it('路由：未认证 401；不存在 404', async () => {
    const denied = await bloodQualityRoutes[0].handle(makeCtx(null));
    expect(denied.status).toBe(401);
    const detailCtx = Object.assign(makeCtx({ id: admin.id }), {
      params: { requestId: '00000000-0000-0000-0000-000000000000' },
    });
    const r404 = await bloodQualityRoutes[bloodQualityRoutes.length - 1].handle(detailCtx);
    expect(r404.status).toBe(404);
  });
});
