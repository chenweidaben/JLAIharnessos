/**
 * 健澜科技 jlmedaios - VTE 智能防治聚合器（M13-A）
 *
 * 风险评估 + 预防建议/确认/执行 + 结局 + 质控指标。
 * 评分与分层全部委托确定性规则引擎（vteRisk.ts），本层负责取数、状态校验、
 * 权限、医疗安全红线与哈希链审计。
 *
 * 医疗安全红线：
 *  - AI 不自主开抗凝药：评估只生成 suggested 预防草稿；药物预防须 vte:prevent 医师
 *    确认，确认时创建 drug 医嘱并由确认医师电子签名（review），走既有医嘱域；
 *  - 高出血风险下药物预防默认 409 拦截，须显式 override 并留原因；
 *  - 机械预防由 vte:execute 护士执行并落护理任务（本人签名）；
 *  - 评估/评分为辅助决策，须由有资质人员确认；PE 危急走既有 criticalValueRepo 闭环。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { createInpatientOrder, reviewOrder } from '../../db/repositories/orderRepo.js';
import {
  createNursingTask,
  executeNursingTask,
} from '../../db/repositories/nursingRepo.js';
import {
  createAssessment,
  getAssessmentById,
  listAssessments,
  getLatestAssessmentByVisit,
  listHighRiskLatest,
  countAssessmentsByVisit,
  createPrevention,
  getPreventionById,
  listPreventions,
  confirmPrevention,
  executePrevention,
  contraindicatePrevention,
  createOutcome,
  listOutcomes,
  type VteAssessment,
  type VtePrevention,
  type VteOutcome,
} from '../../db/repositories/vteRepo.js';
import {
  scoreCaprini,
  scorePadua,
  capriniLevel,
  paduaLevel,
  assessBleeding,
  recommendPrevention,
  detectPreventionMismatch,
  computeVteMetrics,
  type VteScale,
  type VteLevel,
  type BleedingLevel,
  type VteMetricSource,
  type VteMetrics,
} from '../../medical-tools/vte/vteRisk.js';
import {
  extractVteFactors,
  LlmNotConfiguredError,
} from '../../medical-tools/vte/vteFactorExtract.js';

export class VteError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'VteError';
  }
}
const badRequest = (m: string) => new VteError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new VteError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new VteError(409, 'CONFLICT', m);
const forbidden = (m: string) => new VteError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为用户 UUID`);
}

/** 药物预防方法 -> 医嘱内容/剂量默认值（成人常规，特殊人群由医师调整）。 */
const DRUG_ORDER_CONTENT: Record<string, { content: string; dosage: string; frequency: string }> = {
  lmwh: { content: '依诺肝素钠注射液（低分子肝素）皮下注射抗凝预防', dosage: '40mg', frequency: '每日一次' },
  ufh: { content: '普通肝素注射液皮下注射抗凝预防', dosage: '5000IU', frequency: '每8-12小时一次' },
  fondaparinux: { content: '磺达肝癸钠注射液皮下注射抗凝预防', dosage: '2.5mg', frequency: '每日一次' },
  rivaroxaban: { content: '利伐沙班片口服抗凝预防', dosage: '10mg', frequency: '每日一次' },
};

// ---------------------------------------------------------------------------
// 1. 风险评估（自动算分/分层，生成建议性预防草稿）
// ---------------------------------------------------------------------------

export interface AssessInput {
  visitId: string;
  scale: VteScale;
  occasion: string;
  vteFactorKeys: string[];
  bleedingFactorKeys: string[];
  note?: string;
}

export interface AssessResult {
  assessment: VteAssessment;
  suggestedPreventions: VtePrevention[];
  warning: { mismatch: boolean; reason: string };
  recommendationGuidance: string;
}

export async function assessVte(auth: AuthView, input: AssessInput): Promise<AssessResult> {
  assertPermission(auth, 'vte:assess');
  assertUuid(input.visitId, '就诊');
  const visit = await getVisitById(input.visitId);
  if (!visit) throw notFound('就诊不存在');
  if (input.scale !== 'caprini' && input.scale !== 'padua') throw badRequest('scale 须为 caprini 或 padua');
  const occasions = ['admission', 'postop', 'condition_change', 'reassessment'];
  if (!occasions.includes(input.occasion)) throw badRequest('occasion 取值非法');

  const vte = input.scale === 'caprini'
    ? scoreCaprini(input.vteFactorKeys ?? [])
    : scorePadua(input.vteFactorKeys ?? []);
  const vteLevel: VteLevel = input.scale === 'caprini'
    ? capriniLevel(vte.score)
    : paduaLevel(vte.score);
  const bleed = assessBleeding(input.bleedingFactorKeys ?? []);
  const bleedingLevel: BleedingLevel = bleed.level;
  const alertRaised = vteLevel === 'high' || vteLevel === 'very_high';
  const rec = recommendPrevention({ scale: input.scale, vteLevel, bleedingLevel });

  return withTx(async (tx) => {
    const version = (await countAssessmentsByVisit(input.visitId, tx)) + 1;
    const assessment = await createAssessment(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        department: visit.department,
        scale: input.scale,
        occasion: input.occasion,
        vteScore: vte.score,
        vteLevel,
        vteFactors: vte.factors,
        bleedingLevel,
        bleedingFactors: bleed.factors,
        alertRaised,
        version,
        assessedBy: auth.id,
        note: input.note ?? null,
      },
      tx,
    );

    // 生成建议性预防草稿（一律 suggested；AI 不自主开医嘱/执行）
    const suggested: VtePrevention[] = [];
    for (const m of rec.mechanical) {
      suggested.push(
        await createPrevention(
          {
            visitId: visit.id,
            patientId: visit.patientId,
            assessmentId: assessment.id,
            category: 'mechanical',
            method: m.method,
            suggestedBy: auth.id,
          },
          tx,
        ),
      );
    }
    for (const p of rec.pharmacological) {
      const drug = DRUG_ORDER_CONTENT[p.method] ?? DRUG_ORDER_CONTENT.lmwh;
      suggested.push(
        await createPrevention(
          {
            visitId: visit.id,
            patientId: visit.patientId,
            assessmentId: assessment.id,
            category: 'pharmacological',
            method: p.method,
            dosage: drug.dosage,
            frequency: drug.frequency,
            suggestedBy: auth.id,
          },
          tx,
        ),
      );
    }

    const warning = detectPreventionMismatch(vteLevel, suggested.map((s) => ({ status: s.status })));

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'vte.assess',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: alertRaised ? 'high' : 'low',
        detail: {
          scale: input.scale, score: vte.score, level: vteLevel,
          bleedingLevel, alertRaised, suggested: suggested.length, version,
        },
      },
      tx,
    );

    return {
      assessment,
      suggestedPreventions: suggested,
      warning,
      recommendationGuidance: rec.guidance,
    };
  });
}

// ---------------------------------------------------------------------------
// 2. 查询
// ---------------------------------------------------------------------------

export async function listAssessmentsView(
  auth: AuthView,
  filter: { visitId?: string; vteLevel?: string; occasion?: string },
) {
  assertPermission(auth, 'vte:read');
  return listAssessments(filter);
}

export async function getAssessmentView(auth: AuthView, id: string) {
  assertPermission(auth, 'vte:read');
  assertUuid(id, '评估');
  const a = await getAssessmentById(id);
  if (!a) throw notFound('评估记录不存在');
  return a;
}

/** 高危看板：各 visit 最新 high/very_high 评估；非 all 数据范围按科室过滤。 */
export async function getHighRiskBoard(auth: AuthView) {
  assertPermission(auth, 'vte:read');
  const rows = await listHighRiskLatest();
  // DataScope：dept/self 范围仅本科室；admin/all 全量
  const scoped = auth.dataScope === 'all'
    ? rows
    : rows.filter((a) => (a.department ?? '') === auth.deptName);
  // 补充每条是否已有 confirmed/executed 预防（mismatch 提醒）
  const out = [];
  for (const a of scoped) {
    const prevs = await listPreventions({ visitId: a.visitId });
    const w = detectPreventionMismatch(a.vteLevel, prevs);
    out.push({ assessment: a, mismatch: w });
  }
  return out;
}

/** 单就诊全详情：评估历史 + 预防 + 结局。 */
export async function getVisitDetail(auth: AuthView, visitId: string) {
  assertPermission(auth, 'vte:read');
  assertUuid(visitId, '就诊');
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  const assessments = await listAssessments({ visitId });
  const preventions = await listPreventions({ visitId });
  const outcomes = await listOutcomes({ visitId });
  const latest = await getLatestAssessmentByVisit(visitId);
  const warning = latest
    ? detectPreventionMismatch(latest.vteLevel, preventions)
    : { mismatch: false, reason: '' };
  return { visit: { id: visit.id, patientId: visit.patientId, department: visit.department }, assessments, preventions, outcomes, warning };
}

// ---------------------------------------------------------------------------
// 3. 预防措施
// ---------------------------------------------------------------------------

export async function createPreventionView(
  auth: AuthView,
  input: { visitId: string; category: 'mechanical' | 'pharmacological'; method: string; dosage?: string; frequency?: string },
): Promise<VtePrevention> {
  assertPermission(auth, 'vte:assess');
  assertUuid(input.visitId, '就诊');
  const visit = await getVisitById(input.visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!['mechanical', 'pharmacological'].includes(input.category)) throw badRequest('category 非法');
  return withTx(async (tx) => {
    const p = await createPrevention(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        category: input.category,
        method: input.method,
        dosage: input.dosage ?? null,
        frequency: input.frequency ?? null,
        suggestedBy: auth.id,
      },
      tx,
    );
    await recordChainAudit(
      { actorId: auth.id, action: 'vte.prevent.suggest', resourceType: 'visit', resourceId: visit.id, result: 'success', riskLevel: 'low', detail: { preventionId: p.id, category: p.category, method: p.method } },
      tx,
    );
    return p;
  });
}

export async function listPreventionsView(
  auth: AuthView,
  filter: { visitId?: string; status?: string; category?: string },
) {
  assertPermission(auth, 'vte:read');
  return listPreventions(filter);
}

/**
 * 医师确认药物预防（vte:prevent）：
 *  - 仅 pharmacological；高出血风险默认 409 拦截，须 override=true + overrideReason；
 *  - 创建 drug 住院医嘱（pending_review）并由确认医师电子签名（review→active）；
 *  - prevention suggested -> confirmed，绑定 order_id。
 */
export async function confirmPharmacological(
  auth: AuthView,
  id: string,
  input: { override?: boolean; overrideReason?: string } = {},
): Promise<{ prevention: VtePrevention; orderId: string }> {
  assertPermission(auth, 'vte:prevent');
  assertUuid(id, '预防措施');
  const prevention = await getPreventionById(id);
  if (!prevention) throw notFound('预防措施不存在');
  if (prevention.category !== 'pharmacological') throw conflict('仅药物预防需医师确认（机械预防走执行接口）');
  if (prevention.status !== 'suggested') throw conflict(`预防措施状态为 ${prevention.status}，不可重复确认`);

  // 关联评估的出血风险
  const latest = await getLatestAssessmentByVisit(prevention.visitId);
  const bleedingHigh = latest?.bleedingLevel === 'high';
  if (bleedingHigh && !(input.override === true && (input.overrideReason ?? '').trim())) {
    throw conflict('患者出血风险高，药物预防被拦截；须显式 override 并填写原因后方可确认');
  }

  const drug = DRUG_ORDER_CONTENT[prevention.method] ?? DRUG_ORDER_CONTENT.lmwh;
  return withTx(async (tx) => {
    // AI 不自主开方：此处是医师确认后创建医嘱，并立即由确认医师电子签名
    const order = await createInpatientOrder(
      {
        visitId: prevention.visitId,
        orderType: 'drug',
        content: drug.content,
        detail: {
          source: 'vte_prevention',
          preventionId: prevention.id,
          method: prevention.method,
          dosage: prevention.dosage ?? drug.dosage,
          frequency: prevention.frequency ?? drug.frequency,
          bleedingHigh,
          overridden: bleedingHigh && input.override === true,
          overrideReason: input.overrideReason ?? null,
        },
        priority: 'routine',
        category: 'short_term',
        doctorId: auth.id,
        requiresDoubleCheck: true,
      },
      tx as DbExecutor,
    );
    // 电子签名：确认医师审核本医嘱 pending_review -> active
    const signed = await reviewOrder(order.id, auth.id, tx as DbExecutor);
    if (!signed) throw conflict('医嘱电子签名失败');

    const confirmed = await confirmPrevention(prevention.id, auth.id, order.id, tx);
    if (!confirmed) throw conflict('预防措施确认失败（状态已变更）');

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'vte.prevent.confirm',
        resourceType: 'visit',
        resourceId: prevention.visitId,
        result: 'success',
        riskLevel: 'high',
        detail: { preventionId: prevention.id, orderId: order.id, bleedingHigh, overridden: !!input.override },
      },
      tx,
    );
    return { prevention: confirmed, orderId: order.id };
  });
}

/**
 * 护士执行机械预防（vte:execute）：
 *  - 仅 mechanical；创建护理任务并由执行护士本人完成签名；
 *  - prevention suggested -> executed，绑定 nursing_task_id。
 */
export async function executeMechanical(
  auth: AuthView,
  id: string,
): Promise<{ prevention: VtePrevention; nursingTaskId: string }> {
  assertPermission(auth, 'vte:execute');
  assertUuid(id, '预防措施');
  const prevention = await getPreventionById(id);
  if (!prevention) throw notFound('预防措施不存在');
  if (prevention.category !== 'mechanical') throw conflict('仅机械预防走护士执行（药物预防走医师确认）');
  if (prevention.status !== 'suggested') throw conflict(`预防措施状态为 ${prevention.status}，不可重复执行`);

  const methodLabel = prevention.method === 'ipc' ? '间歇充气加压装置(IPC)'
    : prevention.method === 'gcs' ? '梯度压力弹力袜(GCS)' : '足底静脉泵';

  return withTx(async (tx) => {
    const task = await createNursingTask(
      {
        visitId: prevention.visitId,
        patientId: prevention.patientId,
        taskType: 'other',
        content: `VTE 机械预防：${methodLabel}`,
        idempotencyKey: `vte-prev-${prevention.id}`,
      },
      tx as DbExecutor,
    );
    // 护士本人执行签名
    const done = await executeNursingTask(
      task.id, auth.id, `机械预防已执行：${methodLabel}`, tx as DbExecutor,
    );
    if (!done) throw conflict('护理任务执行失败（状态已变更）');

    const executed = await executePrevention(prevention.id, auth.id, task.id, tx);
    if (!executed) throw conflict('预防措施执行失败（状态已变更）');

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'vte.prevent.execute',
        resourceType: 'visit',
        resourceId: prevention.visitId,
        result: 'success',
        riskLevel: 'medium',
        detail: { preventionId: prevention.id, nursingTaskId: task.id, method: prevention.method },
      },
      tx,
    );
    return { prevention: executed, nursingTaskId: task.id };
  });
}

export async function contraindicate(
  auth: AuthView,
  id: string,
  reason: string,
): Promise<VtePrevention> {
  assertPermission(auth, 'vte:prevent');
  assertUuid(id, '预防措施');
  if (!reason || !reason.trim()) throw badRequest('禁忌/停用原因不能为空');
  const prevention = await getPreventionById(id);
  if (!prevention) throw notFound('预防措施不存在');
  return withTx(async (tx) => {
    const updated = await contraindicatePrevention(prevention.id, reason.trim(), tx);
    if (!updated) throw conflict('预防措施当前状态不可标记禁忌');
    await recordChainAudit(
      { actorId: auth.id, action: 'vte.prevent.contraindicate', resourceType: 'visit', resourceId: prevention.visitId, result: 'success', riskLevel: 'medium', detail: { preventionId: prevention.id, reason: reason.trim() } },
      tx,
    );
    return updated;
  });
}

// ---------------------------------------------------------------------------
// 4. 结局与不良事件
// ---------------------------------------------------------------------------

export async function recordOutcomeView(
  auth: AuthView,
  input: {
    visitId: string;
    eventType: string;
    severity?: string;
    source?: string;
    imagingReportId?: string;
    labResultId?: string;
    description?: string;
    occurredAt?: string;
  },
): Promise<VteOutcome> {
  assertPermission(auth, 'vte:assess');
  assertUuid(input.visitId, '就诊');
  const visit = await getVisitById(input.visitId);
  if (!visit) throw notFound('就诊不存在');
  const types = ['dvt', 'pe', 'bleeding', 'anticoag_adverse'];
  if (!types.includes(input.eventType)) throw badRequest('eventType 取值非法');

  return withTx(async (tx) => {
    const outcome = await createOutcome(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        eventType: input.eventType,
        severity: input.severity ?? null,
        source: input.source ?? 'hospital_acquired',
        imagingReportId: input.imagingReportId ?? null,
        labResultId: input.labResultId ?? null,
        description: input.description ?? null,
        recordedBy: auth.id,
        occurredAt: input.occurredAt ?? null,
      },
      tx,
    );
    // PE 属危急：危急值告警走既有 criticalValueRepo 闭环，此处不重复造轮子。
    await recordChainAudit(
      { actorId: auth.id, action: 'vte.outcome', resourceType: 'visit', resourceId: visit.id, result: 'success', riskLevel: input.eventType === 'pe' ? 'high' : 'medium', detail: { outcomeId: outcome.id, eventType: input.eventType } },
      tx,
    );
    return outcome;
  });
}

export async function listOutcomesView(
  auth: AuthView,
  filter: { visitId?: string; eventType?: string },
) {
  assertPermission(auth, 'vte:read');
  return listOutcomes(filter);
}

// ---------------------------------------------------------------------------
// 5. 质控指标
// ---------------------------------------------------------------------------

export async function getVteMetrics(
  auth: AuthView,
  input: { from: string; to: string },
): Promise<{ period: { from: string; to: string }; totalVisits: number; metrics: VteMetrics }> {
  assertPermission(auth, 'vte:audit');
  if (!input.from || !input.to) throw badRequest('起止时间不能为空');
  const db = getDb();

  // 周期内住院 visit 逐行聚合
  const rows = await db`
    WITH base AS (
      SELECT v.id AS visit_id, v.patient_id,
        (SELECT a.vte_level FROM clinical.vte_assessments a
          WHERE a.visit_id = v.id ORDER BY a.assessed_at DESC, a.created_at DESC LIMIT 1) AS latest_level,
        (SELECT count(*) FROM clinical.vte_assessments a WHERE a.visit_id = v.id) AS assess_cnt,
        (SELECT count(*) FROM clinical.vte_preventions p
          WHERE p.visit_id = v.id AND p.status IN ('confirmed','executed')) AS prev_cnt,
        (SELECT count(*) FROM clinical.vte_outcomes o
          WHERE o.visit_id = v.id AND o.event_type IN ('dvt','pe')
            AND o.source = 'hospital_acquired') AS ha_vte_cnt
      FROM clinical.visits v
      WHERE v.visit_type = 'inpatient' AND v.created_at >= ${input.from} AND v.created_at < ${input.to}
    )
    SELECT * FROM base`;

  const sources: VteMetricSource[] = (rows as Record<string, unknown>[]).map((r) => ({
    assessed: Number(r.assess_cnt) > 0,
    latestLevel: (r.latest_level as VteLevel | null) ?? null,
    hasPrevention: Number(r.prev_cnt) > 0,
    hospitalAcquiredVte: Number(r.ha_vte_cnt) > 0,
  }));

  return {
    period: { from: input.from, to: input.to },
    totalVisits: sources.length,
    metrics: computeVteMetrics(sources, sources.length),
  };
}

// ---------------------------------------------------------------------------
// 6. 可选 LLM 危险因素抽取（默认关闭，待确认）
// ---------------------------------------------------------------------------

export async function extractFactors(
  auth: AuthView,
  input: { scale: VteScale; text: string },
) {
  assertPermission(auth, 'vte:assess');
  if (!input.text || !input.text.trim()) throw badRequest('病历文本不能为空');
  if (input.scale !== 'caprini' && input.scale !== 'padua') throw badRequest('scale 须为 caprini 或 padua');
  try {
    const result = await extractVteFactors(input.scale, input.text);
    return { configured: true, ...result };
  } catch (err) {
    if (err instanceof LlmNotConfiguredError) {
      return { configured: false, reason: err.message, vteFactorKeys: [], bleedingFactorKeys: [], pendingConfirmation: true };
    }
    throw err;
  }
}
