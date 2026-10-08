/**
 * 健澜科技 jlmedaios - 临床路径管理聚合器（M15-A）
 *
 * 路径定义/表单、可入径患者匹配、入径签名、路径项目一键下达、变异登记、退出与完成出径、
 * 质控指标。匹配/标准核对/变异分类/指标计算全部委托确定性规则引擎（pathwayRules.ts），
 * 本层负责取数、状态校验、权限、医疗安全红线与哈希链审计。
 *
 * 医疗安全红线：
 *  - AI 不自主开医嘱/诊断：路径标准医嘱仅为待确认清单，一键下达本质是执行人本人在真实
 *    医嘱上电子签名（createInpatientOrder -> reviewOrder）；
 *  - 入径/退出/完成出径均须有 pathway:manage 资质医师电子签名；
 *  - 排除项命中不得入径；出院标准未逐项满足不得完成出径；
 *  - 路径仅为规范辅助，不替代医师判断；特殊情况走变异/退出；
 *  - 所有关键动作落哈希链审计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { getDiagnosesByVisit } from '../../db/repositories/diagnosisRepo.js';
import { createInpatientOrder, reviewOrder } from '../../db/repositories/orderRepo.js';
import {
  listDefinitions,
  getDefinitionById,
  upsertDefinition,
  listFormItems,
  getFormItemById,
  upsertFormItem,
  getEnrollmentById,
  getEnrollmentByVisitPathway,
  listEnrollments,
  createEnrollment,
  completeEnrollment,
  withdrawEnrollment,
  seedPendingExecutions,
  listExecutionsByEnrollment,
  getExecutionByItem,
  markExecutionExecuted,
  markExecutionSkipped,
  createVariation,
  listVariationsByEnrollment,
  aggregateMetricsWindow,
  listDiagnosedInpatientVisits,
  listEligibleCandidates,
  type PathwayDefinitionInput,
  type FormItemInput,
} from '../../db/repositories/pathwayRepo.js';
import {
  currentStageDay,
  matchPathway,
  icdMatches,
  evaluateCriteria,
  hasExclusion,
  classifyVariation,
  negativeVariationSuggestsWithdraw,
  computePathwayMetrics,
  buildOrderFromFormItem,
  type PathwayDefinitionLite,
  type VariationCategory,
} from '../../medical-tools/pathway/pathwayRules.js';

export class PathwayError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PathwayError';
  }
}
const badRequest = (m: string) => new PathwayError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new PathwayError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new PathwayError(409, 'CONFLICT', m);
const forbidden = (m: string) => new PathwayError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

const VARIATION_CATEGORIES: VariationCategory[] = [
  'early_discharge', 'complication', 'resistance', 'abnormal_exam',
  'patient_reason', 'diagnosis_change', 'other',
];

// ---------------------------------------------------------------------------
// 1. 路径定义管理
// ---------------------------------------------------------------------------

export async function listDefinitionsView(
  auth: AuthView,
  filter: { status?: string; icd?: string },
) {
  assertPermission(auth, 'pathway:read');
  return listDefinitions({ status: filter.status, icd: filter.icd });
}

export async function upsertDefinitionView(auth: AuthView, input: PathwayDefinitionInput) {
  assertPermission(auth, 'pathway:manage');
  if (!input.pathwayCode || !input.pathwayCode.trim()) throw badRequest('路径编码不能为空');
  if (!input.name || !input.name.trim()) throw badRequest('路径名称不能为空');
  return withTx(async (tx) => {
    const def = await upsertDefinition(input, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.definition.upsert',
        resourceType: 'pathway_definition',
        resourceId: def.id,
        result: 'success',
        riskLevel: 'low',
        detail: { pathwayCode: def.pathwayCode, icdCode: def.icdCode },
      },
      tx,
    );
    return def;
  });
}

// ---------------------------------------------------------------------------
// 2. 路径表单
// ---------------------------------------------------------------------------

export async function listFormsView(
  auth: AuthView,
  definitionId: string,
  filter: { stageDay?: number },
) {
  assertPermission(auth, 'pathway:read');
  assertUuid(definitionId, '路径定义');
  const def = await getDefinitionById(definitionId);
  if (!def) throw notFound('路径定义不存在');
  return listFormItems(definitionId, { stageDay: filter.stageDay });
}

export async function upsertFormView(
  auth: AuthView,
  definitionId: string,
  input: FormItemInput,
) {
  assertPermission(auth, 'pathway:manage');
  assertUuid(definitionId, '路径定义');
  const def = await getDefinitionById(definitionId);
  if (!def) throw notFound('路径定义不存在');
  if (input.stageDay < 1) throw badRequest('stageDay 须 >= 1');
  if (!input.itemCode || !input.content) throw badRequest('项目编码与内容不能为空');
  return withTx(async (tx) => {
    const item = await upsertFormItem(definitionId, input, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.form.upsert',
        resourceType: 'pathway_definition',
        resourceId: definitionId,
        result: 'success',
        riskLevel: 'low',
        detail: { itemCode: item.itemCode, stageDay: item.stageDay },
      },
      tx,
    );
    return item;
  });
}

// ---------------------------------------------------------------------------
// 3. 可入径患者匹配
// ---------------------------------------------------------------------------

/**
 * 在院住院患者中：诊断 ICD 命中 active 路径，且该就诊尚未入径该路径者。
 * 匹配走确定性规则引擎 matchPathway（前缀）。
 */
export async function listEligibleView(auth: AuthView) {
  assertPermission(auth, 'pathway:read');
  const defs: PathwayDefinitionLite[] = (await listDefinitions({ status: 'active' })).map((d) => ({
    id: d.id, pathwayCode: d.pathwayCode, name: d.name, icdCode: d.icdCode, status: d.status,
  }));
  const candidates = await listEligibleCandidates();

  // 按就诊聚合：取首个命中且未入径的路径
  const byVisit = new Map<string, {
    visitId: string; patientId: string; patientName: string | null; department: string;
    diagnosisName: string; diagnosisCode: string | null; pathwayId: string;
    pathwayCode: string; pathwayName: string;
  }>();
  for (const c of candidates) {
    if (byVisit.has(c.visitId)) continue;
    const m = matchPathway(c.diagnosisCode ?? '', defs);
    if (!m.matched || !m.def) continue;
    if (c.alreadyEnrolledPathwayIds.includes(m.def.id)) continue;
    byVisit.set(c.visitId, {
      visitId: c.visitId,
      patientId: c.patientId,
      patientName: c.patientName,
      department: c.department,
      diagnosisName: c.diagnosisName,
      diagnosisCode: c.diagnosisCode,
      pathwayId: m.def.id,
      pathwayCode: m.def.pathwayCode,
      pathwayName: m.def.name,
    });
  }
  return Array.from(byVisit.values());
}

// ---------------------------------------------------------------------------
// 4. 入径评估与入径（电子签名）
// ---------------------------------------------------------------------------

export interface EnrollInput {
  visitId: string;
  pathwayId: string;
  confirmedInclusion?: string[];
  confirmedExclusion?: string[];
}

export async function enrollView(auth: AuthView, input: EnrollInput) {
  assertPermission(auth, 'pathway:manage');
  assertUuid(input.visitId, '就诊');
  assertUuid(input.pathwayId, '路径');

  const visit = await getVisitById(input.visitId);
  if (!visit) throw notFound('就诊不存在');
  if (visit.visitType !== 'inpatient' || visit.status !== 'ongoing') {
    throw conflict('仅在院住院患者可入径');
  }
  const def = await getDefinitionById(input.pathwayId);
  if (!def) throw notFound('路径定义不存在');
  if (def.status !== 'active') throw conflict('该路径已停用，不可入径');

  const dup = await getEnrollmentByVisitPathway(input.visitId, input.pathwayId);
  if (dup) throw conflict('该就诊已入径该路径，不可重复入径');

  // 诊断匹配：就诊须有已确认诊断命中路径 icd_code
  const diagnoses = await getDiagnosesByVisit(input.visitId);
  const matchedDx = diagnoses.find(
    (d) => d.confirmed && d.code && icdMatches(d.code, def.icdCode),
  );
  if (!matchedDx) throw conflict('就诊诊断与路径病种 ICD 不匹配，不可入径');

  // 排除项命中不得入径
  if (hasExclusion(input.confirmedExclusion ?? [], def.exclusionCriteria)) {
    throw conflict('命中排除标准，不可入径');
  }
  // 入径标准须逐项满足
  const inc = evaluateCriteria(input.confirmedInclusion ?? [], def.inclusionCriteria);
  if (!inc.allMet) {
    throw conflict(`入径标准未全部满足：${inc.unmet.join('；')}`);
  }

  return withTx(async (tx) => {
    const enrollment = await createEnrollment(
      {
        pathwayId: def.id,
        visitId: visit.id,
        patientId: visit.patientId,
        enrollmentDiagnosis: matchedDx.name,
        diagnosisCode: matchedDx.code,
        enrolledBy: auth.id,
      },
      tx,
    );
    // 为路径全部表单项建立 pending 执行记录
    const formItems = await listFormItems(def.id, {}, tx);
    await seedPendingExecutions(enrollment.id, formItems, tx);

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.enroll',
        resourceType: 'pathway_enrollment',
        resourceId: enrollment.id,
        result: 'success',
        riskLevel: 'medium',
        detail: {
          visitId: visit.id, pathwayId: def.id, pathwayCode: def.pathwayCode,
          diagnosis: matchedDx.name, stageCount: formItems.length,
        },
      },
      tx,
    );
    return enrollment;
  });
}

// ---------------------------------------------------------------------------
// 5. 入径列表 / 详情
// ---------------------------------------------------------------------------

export async function listEnrollmentsView(
  auth: AuthView,
  filter: { status?: string; visitId?: string; pathwayId?: string },
) {
  assertPermission(auth, 'pathway:read');
  return listEnrollments({ status: filter.status, visitId: filter.visitId, pathwayId: filter.pathwayId });
}

/** 入径详情：enrollment + 按天分组的表单 + 执行 + 变异 + 阶段日。 */
export async function getEnrollmentDetailView(auth: AuthView, id: string) {
  assertPermission(auth, 'pathway:read');
  assertUuid(id, '入径记录');
  const enrollment = await getEnrollmentById(id);
  if (!enrollment) throw notFound('入径记录不存在');
  const def = await getDefinitionById(enrollment.pathwayId);
  const formItems = def ? await listFormItems(def.id) : [];
  const executions = await listExecutionsByEnrollment(id);
  const variations = await listVariationsByEnrollment(id);
  const visit = await getVisitById(enrollment.visitId);
  const stageDay = visit?.admitAt ? currentStageDay(visit.admitAt, new Date()) : 1;
  return {
    enrollment,
    pathway: def
      ? {
          id: def.id, pathwayCode: def.pathwayCode, name: def.name,
          standardLos: def.standardLos, dischargeCriteria: def.dischargeCriteria,
        }
      : null,
    currentStageDay: stageDay,
    formItems,
    executions,
    variations,
  };
}

// ---------------------------------------------------------------------------
// 6. 路径执行：一键下达（执行人本人电子签名）/ 跳过
// ---------------------------------------------------------------------------

async function loadEnrollmentForMutate(id: string) {
  const enrollment = await getEnrollmentById(id);
  if (!enrollment) throw notFound('入径记录不存在');
  if (enrollment.status !== 'in_path') {
    throw conflict(`入径状态为 ${enrollment.status}，不可执行路径项目`);
  }
  return enrollment;
}

export async function executeFormItemView(
  auth: AuthView,
  enrollmentId: string,
  input: { formItemId: string },
) {
  assertPermission(auth, 'pathway:execute');
  assertUuid(enrollmentId, '入径记录');
  assertUuid(input.formItemId, '表单项');

  const enrollment = await loadEnrollmentForMutate(enrollmentId);
  const formItem = await getFormItemById(input.formItemId);
  if (!formItem || formItem.pathwayId !== enrollment.pathwayId) {
    throw notFound('表单项不属于该路径');
  }
  const exec = await getExecutionByItem(enrollmentId, input.formItemId);
  if (!exec) throw notFound('该表单项无执行记录');
  if (exec.status !== 'pending') throw conflict(`项目状态为 ${exec.status}，不可重复执行`);

  return withTx(async (tx) => {
    // 生成待确认医嘱草稿 -> createInpatientOrder 落 pending_review -> 执行人本人 reviewOrder 签名
    const draft = buildOrderFromFormItem({
      id: formItem.id, stageDay: formItem.stageDay, itemCode: formItem.itemCode,
      itemType: formItem.itemType, content: formItem.content, required: formItem.required,
    });
    const order = await createInpatientOrder(
      {
        visitId: enrollment.visitId,
        orderType: draft.orderType,
        content: draft.content,
        detail: draft.detail,
        priority: 'routine',
        category: 'short_term',
        doctorId: auth.id,
      },
      tx as DbExecutor,
    );
    const signed = await reviewOrder(order.id, auth.id, tx as DbExecutor);
    if (!signed) throw conflict('医嘱电子签名失败');

    const executed = await markExecutionExecuted(exec.id, order.id, auth.id, tx);
    if (!executed) throw conflict('执行记录已被处理');

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.execute',
        resourceType: 'pathway_enrollment',
        resourceId: enrollmentId,
        result: 'success',
        riskLevel: 'medium',
        detail: { formItemId: formItem.id, itemCode: formItem.itemCode, orderId: order.id },
      },
      tx,
    );
    return { execution: executed, orderId: order.id, orderStatus: signed.status };
  });
}

export async function skipFormItemView(
  auth: AuthView,
  enrollmentId: string,
  input: { formItemId: string; status: 'skipped' | 'replaced'; note?: string },
) {
  assertPermission(auth, 'pathway:execute');
  assertUuid(enrollmentId, '入径记录');
  assertUuid(input.formItemId, '表单项');
  if (input.status !== 'skipped' && input.status !== 'replaced') {
    throw badRequest('status 须为 skipped 或 replaced');
  }
  if (!input.note || !input.note.trim()) throw badRequest('跳过/替代原因不能为空');
  const note = input.note.trim();

  const enrollment = await loadEnrollmentForMutate(enrollmentId);
  const exec = await getExecutionByItem(enrollmentId, input.formItemId);
  if (!exec) throw notFound('该表单项无执行记录');
  if (exec.status !== 'pending') throw conflict(`项目状态为 ${exec.status}，不可重复处理`);

  return withTx(async (tx) => {
    const skipped = await markExecutionSkipped(exec.id, input.status, note, auth.id, tx);
    if (!skipped) throw conflict('执行记录已被处理');
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.skip',
        resourceType: 'pathway_enrollment',
        resourceId: enrollmentId,
        result: 'success',
        riskLevel: 'low',
        detail: { formItemId: input.formItemId, status: input.status, note },
      },
      tx,
    );
    return skipped;
  });
}

// ---------------------------------------------------------------------------
// 7. 变异管理
// ---------------------------------------------------------------------------

export async function recordVariationView(
  auth: AuthView,
  enrollmentId: string,
  input: { category: VariationCategory; description: string; stageDay?: number },
) {
  assertPermission(auth, 'pathway:manage');
  assertUuid(enrollmentId, '入径记录');
  if (!VARIATION_CATEGORIES.includes(input.category)) throw badRequest('变异分类取值非法');
  if (!input.description || !input.description.trim()) throw badRequest('变异说明不能为空');

  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) throw notFound('入径记录不存在');
  if (enrollment.status !== 'in_path') {
    throw conflict(`入径状态为 ${enrollment.status}，不可登记变异`);
  }

  const variationType = classifyVariation(input.category);
  const suggestsWithdraw =
    variationType === 'negative' && negativeVariationSuggestsWithdraw(input.category);

  return withTx(async (tx) => {
    const variation = await createVariation(
      {
        enrollmentId,
        stageDay: input.stageDay ?? null,
        variationType,
        category: input.category,
        description: input.description.trim(),
        recordedBy: auth.id,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.variation',
        resourceType: 'pathway_enrollment',
        resourceId: enrollmentId,
        result: 'success',
        riskLevel: variationType === 'negative' ? 'medium' : 'low',
        detail: { variationId: variation.id, category: input.category, type: variationType },
      },
      tx,
    );
    return { variation, suggestsWithdraw };
  });
}

export async function listVariationsView(auth: AuthView, enrollmentId: string) {
  assertPermission(auth, 'pathway:read');
  assertUuid(enrollmentId, '入径记录');
  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) throw notFound('入径记录不存在');
  return listVariationsByEnrollment(enrollmentId);
}

// ---------------------------------------------------------------------------
// 8. 退出路径 / 完成出径
// ---------------------------------------------------------------------------

/** 计算实际住院日（按入院日）与实际费用（取就诊 totalFee）。 */
async function actualValues(visitId: string): Promise<{ los: number | null; fee: number | null }> {
  const visit = await getVisitById(visitId);
  if (!visit) return { los: null, fee: null };
  const los = visit.admitAt ? currentStageDay(visit.admitAt, new Date()) : null;
  return { los, fee: visit.totalFee ?? null };
}

export async function withdrawView(auth: AuthView, enrollmentId: string, input: { reason: string }) {
  assertPermission(auth, 'pathway:manage');
  assertUuid(enrollmentId, '入径记录');
  if (!input.reason || !input.reason.trim()) throw badRequest('退出原因不能为空');

  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) throw notFound('入径记录不存在');
  if (enrollment.status !== 'in_path') {
    throw conflict(`入径状态为 ${enrollment.status}，不可重复退出`);
  }
  const { los, fee } = await actualValues(enrollment.visitId);

  return withTx(async (tx) => {
    const withdrawn = await withdrawEnrollment(
      enrollmentId,
      { withdrawnBy: auth.id, reason: input.reason.trim(), actualLos: los, actualFee: fee },
      tx,
    );
    if (!withdrawn) throw conflict('入径已被处理');
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.withdraw',
        resourceType: 'pathway_enrollment',
        resourceId: enrollmentId,
        result: 'denied',
        riskLevel: 'medium',
        detail: { reason: input.reason.trim() },
      },
      tx,
    );
    return withdrawn;
  });
}

export async function completeView(
  auth: AuthView,
  enrollmentId: string,
  input: { confirmedDischarge: string[] },
) {
  assertPermission(auth, 'pathway:manage');
  assertUuid(enrollmentId, '入径记录');

  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) throw notFound('入径记录不存在');
  if (enrollment.status !== 'in_path') {
    throw conflict(`入径状态为 ${enrollment.status}，不可重复完成出径`);
  }
  const def = await getDefinitionById(enrollment.pathwayId);
  if (!def) throw notFound('路径定义不存在');

  // 出院标准须逐项满足
  const chk = evaluateCriteria(input.confirmedDischarge ?? [], def.dischargeCriteria);
  if (!chk.allMet) {
    throw conflict(`出院标准未全部满足，不可完成出径：${chk.unmet.join('；')}`);
  }
  const { los, fee } = await actualValues(enrollment.visitId);

  return withTx(async (tx) => {
    const completed = await completeEnrollment(
      enrollmentId,
      { completedBy: auth.id, dischargeCriteriaMet: chk.met, actualLos: los, actualFee: fee },
      tx,
    );
    if (!completed) throw conflict('入径已被处理');
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'pathway.complete',
        resourceType: 'pathway_enrollment',
        resourceId: enrollmentId,
        result: 'success',
        riskLevel: 'medium',
        detail: { metCount: chk.met.length, los, fee },
      },
      tx,
    );
    return completed;
  });
}

// ---------------------------------------------------------------------------
// 9. 质控指标（含分子分母）
// ---------------------------------------------------------------------------

export async function getPathwayMetricsView(
  auth: AuthView,
  input: { from: string; to: string },
) {
  assertPermission(auth, 'pathway:audit');
  if (!input.from || !input.to) throw badRequest('起止时间不能为空');
  const db = getDb();

  const windowRows = await aggregateMetricsWindow(input.from, input.to);

  // 入径率分母：窗口内符合路径诊断（命中 active 路径）的 distinct 在院/出院住院人数
  const defs: PathwayDefinitionLite[] = (await listDefinitions({ status: 'active' })).map((d) => ({
    id: d.id, pathwayCode: d.pathwayCode, name: d.name, icdCode: d.icdCode, status: d.status,
  }));
  const dxRows = await listDiagnosedInpatientVisits(input.from, input.to, db);
  const eligibleVisits = new Set<string>();
  for (const r of dxRows) {
    if (matchPathway(r.diagnosisCode ?? '', defs).matched) eligibleVisits.add(r.visitId);
  }

  const metrics = computePathwayMetrics({
    eligibleCount: eligibleVisits.size,
    enrolledCount: windowRows.enrolled,
    completedCount: windowRows.completed,
    withdrawnCount: windowRows.withdrawn,
    variedCount: windowRows.varied,
    losValues: windowRows.losValues,
    feeValues: windowRows.feeValues,
    categoryCounts: windowRows.categoryCounts,
  });

  return { period: { from: input.from, to: input.to }, metrics };
}
