/**
 * 健澜科技 jlmedaios - 临床路径管理闭环 集成测试（M15-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 路径定义/表单项列出；
 *  - 可入径患者匹配（ICD 命中 active 路径）；
 *  - 入径签名：入径成功 / 重复入径 409 / 命中排除项 409；
 *  - 路径执行：一键下达 -> createInpatientOrder + 执行人本人 reviewOrder 电子签名（AI 不自主开方）；
 *  - 跳过/替代；正性/负性变异（负性并发症提示退出）；
 *  - 完成出径：出院标准未满足 409，全部满足 completed；
 *  - 退出路径 withdrawn；
 *  - 质控指标返回分子分母；
 *  - 权限：护士入径 403；404；路由未认证 401。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；无 DB 自动跳过。
 * afterAll 仅删除本测试 M15A_TEST 标签夹具，绝不全表删除（不动路径种子/权限种子）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createDiagnosis } from '../../src/db/repositories/diagnosisRepo.js';
import { getOrderById } from '../../src/db/repositories/orderRepo.js';
import {
  listDefinitionsView,
  listFormsView,
  listEligibleView,
  enrollView,
  getEnrollmentDetailView,
  executeFormItemView,
  skipFormItemView,
  recordVariationView,
  withdrawView,
  completeView,
  getPathwayMetricsView,
} from '../../src/bff/aggregators/pathwayAggregator.js';
import { pathwayRoutes } from '../../src/bff/routes/pathway.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let nurseMa: AuthView;

const TAG = 'M15A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '呼吸内科') {
  const patient = await createPatient({
    mrn: `M15A${seq()}`,
    nameMasked: `P*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1960-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: dept,
    chiefComplaint: '临床路径闭环测试',
  });
  return { patient, visit };
}

async function addDx(visitId: string, patientId: string, code: string, name: string) {
  return createDiagnosis({
    visitId, patientId, code, name, kind: 'primary', confirmed: true,
  });
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
  nurseMa = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 仅删本测试标签夹具：路径业务表 -> 医嘱 -> visit/patient（不动路径/权限种子）
    await db`
      DELETE FROM clinical.pathway_variations v
      USING clinical.pathway_enrollments e, clinical.visits vi, clinical.patients p
      WHERE v.enrollment_id = e.id AND e.visit_id = vi.id AND vi.patient_id = p.id
        AND p.tags @> '["M15A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.pathway_executions x
      USING clinical.pathway_enrollments e, clinical.visits vi, clinical.patients p
      WHERE x.enrollment_id = e.id AND e.visit_id = vi.id AND vi.patient_id = p.id
        AND p.tags @> '["M15A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.pathway_enrollments e
      USING clinical.visits vi, clinical.patients p
      WHERE e.visit_id = vi.id AND vi.patient_id = p.id AND p.tags @> '["M15A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.orders o
      USING clinical.visits vi, clinical.patients p
      WHERE o.visit_id = vi.id AND vi.patient_id = p.id AND p.tags @> '["M15A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.diagnoses dg USING clinical.visits vi, clinical.patients p
      WHERE dg.visit_id = vi.id AND vi.patient_id = p.id AND p.tags @> '["M15A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits vi USING clinical.patients p
      WHERE vi.patient_id = p.id AND p.tags @> '["M15A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M15A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M15-A 临床路径管理闭环（真实 PostgreSQL）', () => {
  it('环境就绪：账号权限分离', () => {
    expect(dbAvailable).toBe(true);
    expect(admin.permissions).toContain('pathway:manage');
    expect(admin.permissions).toContain('pathway:audit');
    expect(doctorChen.permissions).toContain('pathway:manage');
    expect(doctorChen.permissions).toContain('pathway:execute');
    expect(nurseMa.permissions).toContain('pathway:execute');
    expect(nurseMa.permissions).not.toContain('pathway:manage');
  });

  it('路径定义：可列出种子路径并取其表单', async () => {
    const defs = await listDefinitionsView(admin, { status: 'active' });
    const cap = defs.find((d) => d.pathwayCode === 'PW-CAP');
    expect(cap).toBeDefined();
    expect(cap!.icdCode).toBe('J18.9');
    expect(cap!.inclusionCriteria.length).toBeGreaterThan(0);
    expect(cap!.dischargeCriteria.length).toBeGreaterThan(0);
    const forms = await listFormsView(admin, cap!.id, {});
    expect(forms.length).toBeGreaterThan(0);
  });

  it('可入径患者：ICD 命中 active 路径且未入径', async () => {
    const { visit, patient } = await newPatientVisit();
    await addDx(visit.id, patient.id, 'J18.901', '社区获得性肺炎');
    const eligible = await listEligibleView(admin);
    const mine = eligible.find((e) => e.visitId === visit.id);
    expect(mine).toBeDefined();
    expect(mine!.pathwayCode).toBe('PW-CAP');
  });

  it('入径成功 / 重复入径 409 / 命中排除项 409', async () => {
    const defs = await listDefinitionsView(admin, { status: 'active' });
    const cap = defs.find((d) => d.pathwayCode === 'PW-CAP')!;

    // 入径成功
    const { visit, patient } = await newPatientVisit();
    await addDx(visit.id, patient.id, 'J18.9', '社区获得性肺炎');
    const enr = await enrollView(doctorChen, {
      visitId: visit.id, pathwayId: cap.id,
      confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: [],
    });
    expect(enr.status).toBe('in_path');
    expect(enr.enrollmentDiagnosis).toBe('社区获得性肺炎');

    // 重复入径 -> 409
    await expect(
      enrollView(doctorChen, {
        visitId: visit.id, pathwayId: cap.id,
        confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: [],
      }),
    ).rejects.toMatchObject({ status: 409 });

    // 命中排除项 -> 409
    const other = await newPatientVisit();
    await addDx(other.visit.id, other.patient.id, 'J18.9', '社区获得性肺炎');
    await expect(
      enrollView(doctorChen, {
        visitId: other.visit.id, pathwayId: cap.id,
        confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: cap.exclusionCriteria,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('路径执行：一键下达 -> 执行人本人电子签名（AI 不自主开方）；跳过', async () => {
    const defs = await listDefinitionsView(admin, { status: 'active' });
    const cap = defs.find((d) => d.pathwayCode === 'PW-CAP')!;
    const { visit, patient } = await newPatientVisit();
    await addDx(visit.id, patient.id, 'J18.9', '社区获得性肺炎');
    const enr = await enrollView(doctorChen, {
      visitId: visit.id, pathwayId: cap.id,
      confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: [],
    });

    const detail = await getEnrollmentDetailView(admin, enr.id);
    // 选一个 drug 表单项执行
    const drugItem = detail.formItems.find((f) => f.itemType === 'drug')!;
    const execRes = await executeFormItemView(doctorChen, enr.id, { formItemId: drugItem.id });
    expect(execRes.orderStatus).toBe('active');
    // AI 不自主开方：医嘱须由执行人本人电子签名
    const order = await getOrderById(execRes.orderId);
    expect(order).not.toBeNull();
    expect(order!.reviewerId).toBe(doctorChen.id);
    expect(order!.status).toBe('active');

    // 跳过另一个待执行项
    const pendingItems = detail.formItems.filter(
      (f) => !f.required || f.itemCode !== drugItem.itemCode,
    );
    const skipTarget = pendingItems[0];
    const skipped = await skipFormItemView(doctorChen, enr.id, {
      formItemId: skipTarget.id, status: 'skipped', note: '患者拒做该检查',
    });
    expect(skipped.status).toBe('skipped');
  });

  it('变异：正性 early_discharge；负性 complication 提示退出', async () => {
    const defs = await listDefinitionsView(admin, { status: 'active' });
    const cap = defs.find((d) => d.pathwayCode === 'PW-CAP')!;
    const { visit, patient } = await newPatientVisit();
    await addDx(visit.id, patient.id, 'J18.9', '社区获得性肺炎');
    const enr = await enrollView(doctorChen, {
      visitId: visit.id, pathwayId: cap.id,
      confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: [],
    });

    const pos = await recordVariationView(doctorChen, enr.id, {
      category: 'early_discharge', description: '提前达到出院标准',
    });
    expect(pos.variation.variationType).toBe('positive');
    expect(pos.suggestsWithdraw).toBe(false);

    const neg = await recordVariationView(doctorChen, enr.id, {
      category: 'complication', description: '出现脓胸并发症',
    });
    expect(neg.variation.variationType).toBe('negative');
    expect(neg.suggestsWithdraw).toBe(true);
  });

  it('完成出径：出院标准未满足 409；全部满足 completed', async () => {
    const defs = await listDefinitionsView(admin, { status: 'active' });
    const cap = defs.find((d) => d.pathwayCode === 'PW-CAP')!;
    const { visit, patient } = await newPatientVisit();
    await addDx(visit.id, patient.id, 'J18.9', '社区获得性肺炎');
    const enr = await enrollView(doctorChen, {
      visitId: visit.id, pathwayId: cap.id,
      confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: [],
    });

    // 未逐项满足 -> 409
    await expect(
      completeView(doctorChen, enr.id, { confirmedDischarge: [cap.dischargeCriteria[0]] }),
    ).rejects.toMatchObject({ status: 409 });

    // 全部满足 -> completed
    const done = await completeView(doctorChen, enr.id, { confirmedDischarge: cap.dischargeCriteria });
    expect(done.status).toBe('completed');
    expect(done.dischargeCriteriaMet!.length).toBe(cap.dischargeCriteria.length);
  });

  it('退出路径：in_path -> withdrawn', async () => {
    const defs = await listDefinitionsView(admin, { status: 'active' });
    const cap = defs.find((d) => d.pathwayCode === 'PW-CAP')!;
    const { visit, patient } = await newPatientVisit();
    await addDx(visit.id, patient.id, 'J18.9', '社区获得性肺炎');
    const enr = await enrollView(doctorChen, {
      visitId: visit.id, pathwayId: cap.id,
      confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: [],
    });
    const w = await withdrawView(doctorChen, enr.id, { reason: '患者要求转院，退出路径' });
    expect(w.status).toBe('withdrawn');
    expect(w.withdrawReason).toBe('患者要求转院，退出路径');
  });

  it('质控指标：返回分子分母 fractions', async () => {
    const m = await getPathwayMetricsView(admin, { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' });
    expect(m.metrics.completionRate).toHaveProperty('numerator');
    expect(m.metrics.completionRate).toHaveProperty('denominator');
    expect(m.metrics.enrollmentRate).toHaveProperty('rate');
    expect(typeof m.metrics.variationCategoryDistribution).toBe('object');
  });

  it('权限：护士入径 403', async () => {
    const defs = await listDefinitionsView(admin, { status: 'active' });
    const cap = defs.find((d) => d.pathwayCode === 'PW-CAP')!;
    const { visit, patient } = await newPatientVisit();
    await addDx(visit.id, patient.id, 'J18.9', '社区获得性肺炎');
    await expect(
      enrollView(nurseMa, {
        visitId: visit.id, pathwayId: cap.id,
        confirmedInclusion: cap.inclusionCriteria, confirmedExclusion: [],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('404：不存在入径记录', async () => {
    await expect(
      getEnrollmentDetailView(admin, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('路由：未认证 401；不存在入径 404', async () => {
    const route = pathwayRoutes.find((r) => r.path === '/api/v1/pathway/enrollments/:id')!;
    const denied = await route.handle(makeCtx(null));
    expect(denied.status).toBe(401);
    const ctx = Object.assign(makeCtx({ id: admin.id }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    const r404 = await route.handle(ctx);
    expect(r404.status).toBe(404);
  });
});
