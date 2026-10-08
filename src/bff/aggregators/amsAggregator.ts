/**
 * 健澜科技 jlmedaios - 抗菌药物管理聚合器（M14-A）
 *
 * 分级目录、处方授权、特殊使用级审批、围术期/处方/医嘱专项点评、使用记录与质控指标。
 * 点评与权限判定全部委托确定性规则引擎（amsRules.ts），本层负责取数、状态校验、
 * 权限、医疗安全红线与哈希链审计。
 *
 * 医疗安全红线：
 *  - AI 不自主开抗菌药：特殊使用级须 ams:approve 工作组会诊审批并电子签名后才生成医嘱；
 *  - 越权（药品级别高于医师授权）403 拦截；特殊使用级未审批 409 拦截；
 *  - 点评为辅助判定，最终结果由药师（ams:review）签名/退回；
 *  - 所有关键动作落哈希链审计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { createInpatientOrder, reviewOrder } from '../../db/repositories/orderRepo.js';
import {
  listCatalog,
  getCatalogByDrugId,
  getGrantByPrescriber,
  listGrants,
  upsertGrant,
  createSpecialApproval,
  getSpecialById,
  listSpecialApprovals,
  approveSpecial,
  rejectSpecial,
  bindSpecialOrder,
  getApprovedSpecial,
  createReview,
  getReviewById,
  listReviews,
  signReview,
  returnReview,
  createUsage,
  listUsage,
} from '../../db/repositories/amsRepo.js';
import {
  titleToMaxLevel,
  prescriberMaxLevel,
  canPrescribe,
  evaluatePerioperative,
  evaluateAntibioticUse,
  computeDdds,
  computeAud,
  type AbxLevel,
} from '../../medical-tools/ams/amsRules.js';

export class AmsError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AmsError';
  }
}
const badRequest = (m: string) => new AmsError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new AmsError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new AmsError(409, 'CONFLICT', m);
const forbidden = (m: string) => new AmsError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

/** 解析某医师对某药品的可开级别；无授权时按职称兜底。 */
async function resolvePrescriberLevel(
  prescriberId: string, title: string, sql?: DbExecutor,
): Promise<AbxLevel> {
  const grant = await getGrantByPrescriber(prescriberId, sql);
  return prescriberMaxLevel(grant?.maxLevel ?? null, title);
}

// ---------------------------------------------------------------------------
// 1. 分级目录
// ---------------------------------------------------------------------------

export async function listCatalogView(auth: AuthView, filter: { atcLevel?: string }) {
  assertPermission(auth, 'ams:read');
  return listCatalog({ atcLevel: filter.atcLevel });
}

// ---------------------------------------------------------------------------
// 2. 处方授权管理（工作组/质控）
// ---------------------------------------------------------------------------

export async function listGrantsView(auth: AuthView) {
  assertPermission(auth, 'ams:read');
  return listGrants();
}

export async function upsertGrantView(
  auth: AuthView,
  input: { prescriberId: string; maxLevel: AbxLevel },
) {
  assertPermission(auth, 'ams:audit');
  assertUuid(input.prescriberId, '医师');
  if (!['unrestricted', 'restricted', 'special'].includes(input.maxLevel)) {
    throw badRequest('maxLevel 取值非法');
  }
  return withTx(async (tx) => {
    const grant = await upsertGrant(input.prescriberId, input.maxLevel, auth.id, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.grant.upsert',
        resourceType: 'user',
        resourceId: input.prescriberId,
        result: 'success',
        riskLevel: 'medium',
        detail: { maxLevel: input.maxLevel },
      },
      tx,
    );
    return grant;
  });
}

// ---------------------------------------------------------------------------
// 3. 特殊使用级会诊审批
// ---------------------------------------------------------------------------

/**
 * 医师申请特殊使用级抗菌药：
 *  - 药品须为 special；
 *  - 越权（医师级别 < special）直接 403；
 *  - 生成 pending 审批单（AI 不自主开方）。
 */
export async function applySpecialApproval(
  auth: AuthView,
  input: { visitId: string; drugId: string; indication?: string; consultationOpinion?: string; consultantId?: string },
) {
  assertPermission(auth, 'ams:prescribe');
  assertUuid(input.visitId, '就诊');
  assertUuid(input.drugId, '药品');
  const visit = await getVisitById(input.visitId);
  if (!visit) throw notFound('就诊不存在');
  const drug = await getCatalogByDrugId(input.drugId);
  if (!drug) throw notFound('该药品不在抗菌药分级目录');
  if (drug.atcLevel !== 'special') throw conflict('仅特殊使用级抗菌药需会诊审批');

  const maxLevel = await resolvePrescriberLevel(auth.id, auth.title);
  if (!canPrescribe(maxLevel, 'special')) {
    throw forbidden(`您的处方授权为 ${maxLevel}，不能申请特殊使用级抗菌药`);
  }

  return withTx(async (tx) => {
    const approval = await createSpecialApproval(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        prescriberId: auth.id,
        drugId: drug.drugId,
        indication: input.indication ?? null,
        consultationOpinion: input.consultationOpinion ?? null,
        consultantId: input.consultantId ?? null,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.special.apply',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: 'high',
        detail: { approvalId: approval.id, drugId: drug.drugId },
      },
      tx,
    );
    return approval;
  });
}

/**
 * 工作组审批通过（ams:approve）：
 *  - CAS pending -> approved（电子签名）；
 *  - 同步创建 drug 住院医嘱并由审批医师电子签名（review -> active）；
 *  - AI 不自主开方：此处是审批人签名后才生成医嘱。
 */
export async function approveSpecialView(
  auth: AuthView,
  approvalId: string,
  input: { consultantId?: string } = {},
) {
  assertPermission(auth, 'ams:approve');
  assertUuid(approvalId, '审批单');
  const existing = await getSpecialById(approvalId);
  if (!existing) throw notFound('特殊使用级审批单不存在');
  if (existing.status !== 'pending') throw conflict(`审批单状态为 ${existing.status}，不可重复审批`);
  const drug = await getCatalogByDrugId(existing.drugId);
  if (!drug) throw notFound('药品目录缺失');

  return withTx(async (tx) => {
    const approved = await approveSpecial(approvalId, auth.id, tx);
    if (!approved) throw conflict('审批单已被处理');

    // 审批通过后生成抗菌药医嘱并由审批人电子签名
    const order = await createInpatientOrder(
      {
        visitId: approved.visitId,
        orderType: 'drug',
        content: `特殊使用级抗菌药（${drug.genericName ?? ''}）治疗用药`,
        detail: {
          source: 'ams_special_approval',
          approvalId: approved.id,
          drugId: approved.drugId,
          atcLevel: drug.atcLevel,
        },
        priority: 'routine',
        category: 'long_term',
        doctorId: approved.prescriberId,
        requiresDoubleCheck: true,
      },
      tx as DbExecutor,
    );
    const signed = await reviewOrder(order.id, auth.id, tx as DbExecutor);
    if (!signed) throw conflict('医嘱电子签名失败');

    await bindSpecialOrder(approved.id, order.id, tx);

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.special.approve',
        resourceType: 'visit',
        resourceId: approved.visitId,
        result: 'success',
        riskLevel: 'high',
        detail: { approvalId: approved.id, orderId: order.id, drugId: approved.drugId },
      },
      tx,
    );
    return { approval: approved, orderId: order.id };
  });
}

/** 工作组驳回（ams:approve）：驳回后不可使用。 */
export async function rejectSpecialView(
  auth: AuthView,
  approvalId: string,
  reason: string,
) {
  assertPermission(auth, 'ams:approve');
  assertUuid(approvalId, '审批单');
  if (!reason || !reason.trim()) throw badRequest('驳回原因不能为空');
  const existing = await getSpecialById(approvalId);
  if (!existing) throw notFound('特殊使用级审批单不存在');
  return withTx(async (tx) => {
    const rejected = await rejectSpecial(approvalId, auth.id, reason.trim(), tx);
    if (!rejected) throw conflict('审批单已被处理');
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.special.reject',
        resourceType: 'visit',
        resourceId: existing.visitId,
        result: 'denied',
        riskLevel: 'medium',
        detail: { approvalId: approvalId, reason: reason.trim() },
      },
      tx,
    );
    return rejected;
  });
}

// ---------------------------------------------------------------------------
// 4. 使用记录（含越权/未审批拦截）
// ---------------------------------------------------------------------------

export interface ConsumeInput {
  visitId: string;
  drugId: string;
  purpose: 'prophylactic' | 'therapeutic';
  dose: number;
  doseUnit: string;
  frequency?: string;
  route?: string;
  usageDays?: number;
  totalAmount?: number;
  cultureSent?: boolean;
}

/**
 * 记录一次抗菌药使用（=开方/给药留痕）：
 *  - 越权（药品级别 > 医师授权）403；
 *  - 特殊使用级但该就诊无 approved 审批 409；
 *  - 成功则按 DDD 计算 DDDs 并落库。
 */
export async function consumeAntibiotic(auth: AuthView, input: ConsumeInput) {
  assertPermission(auth, 'ams:prescribe');
  assertUuid(input.visitId, '就诊');
  assertUuid(input.drugId, '药品');
  const visit = await getVisitById(input.visitId);
  if (!visit) throw notFound('就诊不存在');
  const drug = await getCatalogByDrugId(input.drugId);
  if (!drug) throw notFound('该药品不在抗菌药分级目录');

  const maxLevel = await resolvePrescriberLevel(auth.id, auth.title);
  if (!canPrescribe(maxLevel, drug.atcLevel)) {
    throw forbidden(`药品为${drug.atcLevel}，您的授权为${maxLevel}，越权开具被拦截`);
  }
  if (drug.atcLevel === 'special') {
    const approved = await getApprovedSpecial(visit.id, drug.drugId);
    if (!approved) throw conflict('特殊使用级抗菌药须先经会诊审批，未审批不得使用');
  }

  return withTx(async (tx) => {
    const usage = await createUsage(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        drugId: drug.drugId,
        purpose: input.purpose,
        dose: input.dose,
        doseUnit: input.doseUnit,
        frequency: input.frequency ?? null,
        route: input.route ?? drug.defaultRoute,
        usageDays: input.usageDays ?? 1,
        totalAmount: input.totalAmount ?? null,
        cultureSent: input.cultureSent ?? false,
      },
      drug.ddd,
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.usage.record',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: drug.atcLevel === 'special' ? 'high' : 'low',
        detail: { drugId: drug.drugId, purpose: input.purpose, ddds: usage.ddds },
      },
      tx,
    );
    return usage;
  });
}

// ---------------------------------------------------------------------------
// 5. 围术期 / 处方 / 医嘱专项点评
// ---------------------------------------------------------------------------

export interface ReviewInput {
  visitId: string;
  reviewType: 'perioperative' | 'prescription' | 'order';
  targetId?: string;
  // 围术期
  incisionClass?: 'I' | 'II' | 'III';
  drugId?: string;
  timingMinutes?: number;
  durationHours?: number;
  isCesarean?: boolean;
  // 处方/医嘱专项
  indication?: 'none' | 'documented';
  doseMultiplier?: number;
  durationDays?: number;
  duplicate?: boolean;
  contraindication?: boolean;
  interaction?: boolean;
}

export async function createReviewView(auth: AuthView, input: ReviewInput) {
  assertPermission(auth, 'ams:review');
  assertUuid(input.visitId, '就诊');
  const visit = await getVisitById(input.visitId);
  if (!visit) throw notFound('就诊不存在');

  let verdict;
  let reviewDetail: Record<string, unknown>;
  if (input.reviewType === 'perioperative') {
    const cat = input.drugId ? await getCatalogByDrugId(input.drugId) : null;
    verdict = evaluatePerioperative({
      incisionClass: input.incisionClass ?? 'I',
      drugClass: cat ? cat.pharmClass : 'other',
      timingMinutes: input.timingMinutes,
      durationHours: input.durationHours,
      isCesarean: input.isCesarean,
    });
    reviewDetail = {
      summary: verdict.summary,
      incisionClass: input.incisionClass ?? 'I',
      timingMinutes: input.timingMinutes ?? null,
      durationHours: input.durationHours ?? null,
      isCesarean: input.isCesarean ?? false,
    };
  } else {
    verdict = evaluateAntibioticUse({
      indication: input.indication,
      doseMultiplier: input.doseMultiplier,
      durationDays: input.durationDays,
      duplicate: input.duplicate,
      contraindication: input.contraindication,
      interaction: input.interaction,
    });
    reviewDetail = { summary: verdict.summary };
  }

  return withTx(async (tx) => {
    const review = await createReview(
      {
        reviewType: input.reviewType,
        targetId: input.targetId ?? null,
        visitId: visit.id,
        patientId: visit.patientId,
        result: verdict.rational ? 'rational' : 'irrational',
        issueTypes: verdict.issueTypes,
        detail: reviewDetail,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.review.create',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: verdict.rational ? 'low' : 'medium',
        detail: { reviewId: review.id, reviewType: input.reviewType, issueTypes: verdict.issueTypes },
      },
      tx,
    );
    return review;
  });
}

export async function listReviewsView(
  auth: AuthView,
  filter: { reviewType?: string; status?: string },
) {
  assertPermission(auth, 'ams:read');
  return listReviews(filter);
}

/** 药师签名点评（ams:review）：pending_review -> signed。 */
export async function signReviewView(auth: AuthView, id: string, note: string) {
  assertPermission(auth, 'ams:review');
  assertUuid(id, '点评');
  const review = await getReviewById(id);
  if (!review) throw notFound('点评记录不存在');
  return withTx(async (tx) => {
    const signed = await signReview(id, auth.id, note || '签名确认合理', tx);
    if (!signed) throw conflict('点评已被处理，不可重复签名');
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.review.sign',
        resourceType: 'visit',
        resourceId: review.visitId,
        result: 'success',
        riskLevel: 'medium',
        detail: { reviewId: id },
      },
      tx,
    );
    return signed;
  });
}

/** 药师退回点评（ams:review）：pending_review -> returned。 */
export async function returnReviewView(auth: AuthView, id: string, note: string) {
  assertPermission(auth, 'ams:review');
  assertUuid(id, '点评');
  if (!note || !note.trim()) throw badRequest('退回原因不能为空');
  const review = await getReviewById(id);
  if (!review) throw notFound('点评记录不存在');
  return withTx(async (tx) => {
    const returned = await returnReview(id, auth.id, note.trim(), tx);
    if (!returned) throw conflict('点评已被处理，不可退回');
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'ams.review.return',
        resourceType: 'visit',
        resourceId: review.visitId,
        result: 'denied',
        riskLevel: 'low',
        detail: { reviewId: id, note: note.trim() },
      },
      tx,
    );
    return returned;
  });
}

// ---------------------------------------------------------------------------
// 7. 集合查询（特殊审批列表 / 使用记录列表）与 CDS 规则预检（不入库）
// ---------------------------------------------------------------------------

/** 特殊审批列表（可按状态过滤）。 */
export async function listSpecialApprovalsView(
  auth: AuthView,
  filter: { status?: string },
) {
  assertPermission(auth, 'ams:read');
  return listSpecialApprovals(filter);
}

/** 使用记录列表（可按就诊过滤）。 */
export async function listUsageView(
  auth: AuthView,
  filter: { visitId?: string },
) {
  assertPermission(auth, 'ams:read');
  return listUsage(filter);
}

/** 后端规则引擎问题码 → 前端 AmxIssueCode 映射。 */
const ISSUE_CODE_MAP: Record<string, string> = {
  drug_not_recommended: 'wrong_choice',
  timing_incorrect: 'wrong_timing',
  duration_excessive: 'wrong_duration',
  duration_over_24h: 'wrong_duration',
  no_indication: 'no_indication',
  overdose: 'overdose',
  over_duration: 'overduration',
  duplicate: 'duplicate',
  contraindication: 'contraindication',
  interaction: 'interaction',
};

/**
 * CDS 规则预检（不入库、不审计）：供开单/围术期前端实时复核。
 * 接受前端字段名，转调后端确定性规则引擎并映射问题码。
 */
export async function checkRulesView(
  auth: AuthView,
  input: {
    kind: 'perioperative' | 'antibioticUse';
    incisionClass?: 'I' | 'II' | 'III';
    chosenClass?: import('../../medical-tools/ams/amsRules.js').PharmClass;
    chosenIsSpecial?: boolean;
    doseMinusIncisionMin?: number;
    isCesarean?: boolean;
    durationH?: number;
    hasProlongReason?: boolean;
    indication?: 'none' | 'documented';
    doseMultiplier?: number;
    durationDays?: number;
    duplicate?: boolean;
    contraindication?: boolean;
    interaction?: boolean;
  },
): Promise<{ rational: boolean; issues: string[]; detail: Record<string, unknown> }> {
  assertPermission(auth, 'ams:read');
  let verdict;
  if (input.kind === 'perioperative') {
    verdict = evaluatePerioperative({
      incisionClass: input.incisionClass ?? 'I',
      drugClass: input.chosenClass ?? 'other',
      timingMinutes: input.doseMinusIncisionMin,
      durationHours: input.durationH,
      isCesarean: input.isCesarean,
    });
  } else {
    verdict = evaluateAntibioticUse({
      indication: input.indication,
      doseMultiplier: input.doseMultiplier,
      durationDays: input.durationDays,
      duplicate: input.duplicate,
      contraindication: input.contraindication,
      interaction: input.interaction,
    });
  }
  const issues = verdict.issueTypes.map((c) => ISSUE_CODE_MAP[c] ?? c);
  return { rational: verdict.rational, issues, detail: { summary: verdict.summary } };
}

// ---------------------------------------------------------------------------
// 6. 质控指标
// ---------------------------------------------------------------------------

interface AmsFraction {
  numerator: number;
  denominator: number;
}
interface AmsMetricsResult {
  outpatientAbxRate: number;
  inpatientAbxRate: number;
  aud: number;
  classIProphylaxisRate: number;
  timingAppropriateRate: number;
  durationComplianceRate: number;
  specialShare: number;
  cultureRate: number;
  fractions: {
    outpatientAbxRate: AmsFraction;
    inpatientAbxRate: AmsFraction;
    aud: AmsFraction;
    classIProphylaxisRate: AmsFraction;
    timingAppropriateRate: AmsFraction;
    durationComplianceRate: AmsFraction;
    specialShare: AmsFraction;
    cultureRate: AmsFraction;
  };
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Number(((n / d) * 100).toFixed(2));
}

export async function getAmsMetrics(
  auth: AuthView,
  input: { from: string; to: string },
): Promise<{ period: { from: string; to: string }; ddds: number; aud: number; metrics: AmsMetricsResult }> {
  assertPermission(auth, 'ams:audit');
  if (!input.from || !input.to) throw badRequest('起止时间不能为空');
  const db = getDb();

  // 1. 周期内使用记录聚合（总/特殊 DDDs、治疗性、送检、住院抗菌药患者数）
  const rows = await db`
    SELECT
      COALESCE(SUM(u.total_amount / NULLIF(ac.ddd, 0)) FILTER (WHERE u.total_amount IS NOT NULL), 0)::float AS total_ddds,
      COALESCE(SUM(u.total_amount / NULLIF(ac.ddd, 0)) FILTER (WHERE u.total_amount IS NOT NULL AND ac.atc_level = 'special'), 0)::float AS special_ddds,
      COUNT(*) FILTER (WHERE u.purpose = 'therapeutic')::int AS therapeutic_total,
      COUNT(*) FILTER (WHERE u.purpose = 'therapeutic' AND u.culture_sent = true)::int AS culture_total,
      COUNT(DISTINCT u.patient_id) FILTER (WHERE v.visit_type = 'inpatient')::int AS inpatient_abx_patients
    FROM clinical.ams_usage_records u
    JOIN clinical.antibiotic_catalog ac ON ac.drug_id = u.drug_id
    LEFT JOIN clinical.visits v ON v.id = u.visit_id
    WHERE u.administered_at >= ${input.from} AND u.administered_at < ${input.to}`;
  const r = rows[0] as Record<string, unknown>;
  const totalDdds = Number(r.total_ddds) || 0;
  const specialDdds = Number(r.special_ddds) || 0;
  const therapeuticTotal = Number(r.therapeutic_total) || 0;
  const cultureTotal = Number(r.culture_total) || 0;
  const inpatientAbxPatients = Number(r.inpatient_abx_patients) || 0;

  // 2. 同期住院患者人天：按各住院就诊 [admit_at, discharge_at] 与统计区间重叠求和；未出院以当前时间截断。
  const patientDaysRow = await db`
    SELECT COALESCE(SUM(
      GREATEST(0,
        EXTRACT(EPOCH FROM (
          LEAST(COALESCE(v.discharge_at, now()), ${input.to}::timestamptz)
          - GREATEST(v.admit_at, ${input.from}::timestamptz)
        )) / 86400.0
      )
    ), 0)::float AS patient_days,
    COUNT(*) FILTER (WHERE v.admit_at < ${input.to}::timestamptz
      AND COALESCE(v.discharge_at, now()) > ${input.from}::timestamptz)::int AS inpatient_total
    FROM clinical.visits v
    WHERE v.visit_type = 'inpatient' AND v.admit_at IS NOT NULL`;
  const pd = patientDaysRow[0] as Record<string, unknown>;
  const patientDays = Number(pd.patient_days) || 0;
  const inpatientTotal = Number(pd.inpatient_total) || 0;

  // 3. 门诊抗菌药处方比例：门诊就诊的 drug 医嘱中，detail.drugId 命中抗菌药目录的比例。
  const outpatientRow = await db`
    SELECT
      COUNT(*) FILTER (WHERE o.detail->>'drugId' IS NOT NULL
        AND (o.detail->>'drugId') IN (SELECT drug_id::text FROM clinical.antibiotic_catalog))::int AS outpatient_abx,
      COUNT(*)::int AS outpatient_drug_total
    FROM clinical.orders o
    JOIN clinical.visits v ON v.id = o.visit_id
    WHERE v.visit_type = 'outpatient' AND o.order_type = 'drug'
      AND o.created_at >= ${input.from} AND o.created_at < ${input.to}`;
  const od = outpatientRow[0] as Record<string, unknown>;
  const outpatientAbx = Number(od.outpatient_abx) || 0;
  const outpatientDrugTotal = Number(od.outpatient_drug_total) || 0;

  // 4. 围术期 I 类切口点评：预防用药率（判合理）、时机合理率、疗程合格率。
  const periRow = await db`
    SELECT
      COUNT(*) FILTER (WHERE r.result = 'rational')::int AS class_i_prophylaxis,
      COUNT(*) FILTER (WHERE NOT (r.issue_types @> '["timing_incorrect"]'::jsonb))::int AS timing_ok,
      COUNT(*) FILTER (WHERE NOT (r.issue_types @> '["duration_excessive"]'::jsonb)
        AND NOT (r.issue_types @> '["duration_over_24h"]'::jsonb))::int AS duration_ok,
      COUNT(*)::int AS class_i_total
    FROM clinical.ams_reviews r
    WHERE r.review_type = 'perioperative'
      AND r.detail->>'incisionClass' = 'I'
      AND r.created_at >= ${input.from} AND r.created_at < ${input.to}`;
  const pe = periRow[0] as Record<string, unknown>;
  const classIProphylaxis = Number(pe.class_i_prophylaxis) || 0;
  const timingOk = Number(pe.timing_ok) || 0;
  const durationOk = Number(pe.duration_ok) || 0;
  const classITotal = Number(pe.class_i_total) || 0;

  const aud = computeAud(totalDdds, patientDays);

  const metrics: AmsMetricsResult = {
    outpatientAbxRate: pct(outpatientAbx, outpatientDrugTotal),
    inpatientAbxRate: pct(inpatientAbxPatients, inpatientTotal),
    aud,
    classIProphylaxisRate: pct(classIProphylaxis, classITotal),
    timingAppropriateRate: pct(timingOk, classITotal),
    durationComplianceRate: pct(durationOk, classITotal),
    specialShare: pct(specialDdds, totalDdds),
    cultureRate: pct(cultureTotal, therapeuticTotal),
    fractions: {
      outpatientAbxRate: { numerator: outpatientAbx, denominator: outpatientDrugTotal },
      inpatientAbxRate: { numerator: inpatientAbxPatients, denominator: inpatientTotal },
      aud: { numerator: Number(totalDdds.toFixed(2)), denominator: Number(patientDays.toFixed(2)) },
      classIProphylaxisRate: { numerator: classIProphylaxis, denominator: classITotal },
      timingAppropriateRate: { numerator: timingOk, denominator: classITotal },
      durationComplianceRate: { numerator: durationOk, denominator: classITotal },
      specialShare: { numerator: Number(specialDdds.toFixed(2)), denominator: Number(totalDdds.toFixed(2)) },
      cultureRate: { numerator: cultureTotal, denominator: therapeuticTotal },
    },
  };

  return {
    period: { from: input.from, to: input.to },
    ddds: Number(totalDdds.toFixed(2)),
    aud,
    metrics,
  };
}
