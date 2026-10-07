/**
 * 健澜科技 jlmedaios - 临床用血质量聚合器（M10-B）
 *
 * 输血疗效评估 + 用血合理性评价 + 等级评审质控指标。
 * 规则判定全部委托确定性规则引擎，本层负责取数、状态校验、权限与哈希链审计。
 *
 * AI 仅辅助：疗效与合理性结论由规则引擎基于真实检验数据生成，评估医师可补充说明，
 * 不可无依据改写；所有结论审计留痕。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  getById,
  getTransfusionByRequest,
} from '../../db/repositories/transfusionRepo.js';
import {
  upsertEfficacy,
  getEfficacyByTransfusion,
  listEfficacy,
  upsertUtilization,
  getUtilizationByRequest,
  listUtilization,
  findMetricBefore,
  findMetricAfter,
  type MetricPoint,
  type EfficacyAssessment,
  type UtilizationReview,
} from '../../db/repositories/bloodQualityRepo.js';
import {
  expectedEfficacy,
  gradeEfficacy,
  strictIndication,
  dosageReasonable,
  preTestComplete,
  concludeUtilization,
  computeQualityMetrics,
  type BloodComponent,
  type EfficacyGrade,
  type UtilizationConclusion,
  type BloodQualityMetrics,
} from '../../medical-tools/quality/bloodUtilizationQuality.js';

export class BloodQualityError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BloodQualityError';
  }
}
const badRequest = (m: string) => new BloodQualityError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new BloodQualityError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new BloodQualityError(409, 'CONFLICT', m);
const forbidden = (m: string) => new BloodQualityError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为用户 UUID`);
}

/** 各成分对应的疗效指标匹配关键词。 */
const METRIC_PATTERNS: Record<BloodComponent, string[]> = {
  red_cell: ['HGB', '血红蛋白'],
  plasma: ['INR', '凝血酶原国际'],
  platelet: ['PLT', '血小板'],
  cryo: ['FIB', 'FIBRINOGEN', '纤维蛋白原'],
  whole: ['HGB', '血红蛋白'],
};

async function getLabResultPoint(id: string): Promise<MetricPoint | null> {
  const db = getDb();
  const rows = await db`
    SELECT id, numeric_value, value, result_time FROM clinical.lab_results WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  const v = r.numeric_value !== null ? Number(r.numeric_value) : Number.parseFloat(String(r.value));
  return { resultId: String(r.id), value: Number.isFinite(v) ? v : NaN, resultTime: String(r.result_time) };
}

// ---------------------------------------------------------------------------
// 1. 输血疗效评估
// ---------------------------------------------------------------------------

export async function assessEfficacy(
  auth: AuthView,
  input: {
    requestId: string;
    preResultId?: string;
    postResultId?: string;
    manualPre?: number;
    manualPost?: number;
    windowHours?: number;
    note?: string;
  },
): Promise<{ assessment: EfficacyAssessment; created: boolean; reasons: string[] }> {
  assertPermission(auth, 'blood:assess');
  assertUuid(input.requestId, '输血申请');
  const req = await getById(input.requestId);
  if (!req) throw notFound('输血申请不存在');
  const transfusion = await getTransfusionByRequest(input.requestId);
  if (!transfusion) throw conflict('无输注记录，无法评估疗效');
  if (transfusion.status !== 'completed') {
    throw conflict(`输注状态为 ${transfusion.status}，须完成后再评估疗效`);
  }
  const startAt = String(transfusion.start_at);
  const endAt = String(transfusion.end_at);
  const patterns = METRIC_PATTERNS[req.component as BloodComponent];
  const windowHours = Number.isFinite(input.windowHours) ? Number(input.windowHours) : 72;

  // 输注前基线：手动值 > 指定结果 > 自动匹配
  let pre: MetricPoint | null;
  if (input.manualPre !== undefined && input.manualPre !== null) {
    pre = { resultId: '', value: Number(input.manualPre), resultTime: '' };
  } else if (input.preResultId) {
    assertUuid(input.preResultId, '输注前结果');
    pre = await getLabResultPoint(input.preResultId);
  } else {
    pre = await findMetricBefore(req.patientId, patterns, startAt);
  }
  // 输注后复查
  let post: MetricPoint | null;
  if (input.manualPost !== undefined && input.manualPost !== null) {
    post = { resultId: '', value: Number(input.manualPost), resultTime: '' };
  } else if (input.postResultId) {
    assertUuid(input.postResultId, '输注后结果');
    post = await getLabResultPoint(input.postResultId);
  } else {
    post = await findMetricAfter(req.patientId, patterns, endAt, windowHours);
  }

  const preVal = pre ? pre.value : null;
  const postVal = post ? post.value : null;
  const grade = gradeEfficacy(
    req.component as BloodComponent,
    req.unitCount,
    preVal !== null && Number.isFinite(preVal) ? preVal : null,
    postVal !== null && Number.isFinite(postVal) ? postVal : null,
  );
  const exp = expectedEfficacy(req.component as BloodComponent, req.unitCount);

  return withTx(async (tx) => {
    const { assessment, created } = await upsertEfficacy(
      {
        transfusionId: String(transfusion.id),
        requestId: req.id,
        visitId: req.visitId,
        patientId: req.patientId,
        assessedBy: auth.id,
        component: req.component,
        preMetric: grade.pre,
        postMetric: grade.post,
        metricUnit: exp.metricUnit,
        expectedDelta: exp.expectedDelta,
        actualDelta: grade.actualDelta,
        efficacyGrade: grade.grade,
        preResultId: pre?.resultId || null,
        postResultId: post?.resultId || null,
        note: input.note ?? grade.reasons.join('；'),
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'blood.efficacy',
        resourceType: 'transfusion',
        resourceId: req.id,
        result: 'success',
        riskLevel: 'medium',
        detail: { grade: grade.grade, created },
      },
      tx,
    );
    return { assessment, created, reasons: grade.reasons };
  });
}

// ---------------------------------------------------------------------------
// 2. 用血合理性评价
// ---------------------------------------------------------------------------

async function getPatientTestCodes(patientId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db`
    SELECT DISTINCT item_code, item_name FROM clinical.lab_results WHERE patient_id = ${patientId}`;
  const out: string[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    if (r.item_code) out.push(String(r.item_code));
    if (r.item_name) out.push(String(r.item_name));
  }
  return out;
}

export async function reviewUtilization(
  auth: AuthView,
  input: {
    requestId: string;
    conclusionNote?: string;
    /** 评审员可基于补充材料人工确认指征（须在 note 中说明依据） */
    manualIndication?: boolean;
  },
): Promise<{ review: UtilizationReview; created: boolean }> {
  assertPermission(auth, 'blood:audit');
  assertUuid(input.requestId, '输血申请');
  const req = await getById(input.requestId);
  if (!req) throw notFound('输血申请不存在');

  const component = req.component as BloodComponent;
  const ind = strictIndication(component, (req.indicationMeta ?? {}) as Record<string, unknown>);
  const dos = dosageReasonable(component, req.unitCount, req.urgency);
  const available = await getPatientTestCodes(req.patientId);
  const pre = preTestComplete(available);

  // 评审员可人工确认指征（如急诊抢救未留检验、但有明确临床依据）
  const indicationCompliant = input.manualIndication === true ? true : ind.compliant;
  const verdict = concludeUtilization({
    indicationCompliant,
    dosageReasonable: dos.reasonable,
    preTestComplete: pre.complete,
    preTestMissing: pre.missing,
    dosageNote: dos.note,
  });

  // 关联已有疗效
  const transfusion = await getTransfusionByRequest(input.requestId);
  let efficacyGrade: EfficacyGrade | null = null;
  if (transfusion) {
    const eff = await getEfficacyByTransfusion(String(transfusion.id));
    if (eff) efficacyGrade = eff.efficacyGrade;
  }

  const issues = [...verdict.issues];
  if (!ind.compliant && indicationCompliant) {
    issues.push('系统未自动命中指征，由评审员人工确认，需补充临床依据');
  }
  if (!ind.compliant && !indicationCompliant) issues.push(ind.guidance);

  return withTx(async (tx) => {
    const { review, created } = await upsertUtilization(
      {
        requestId: req.id,
        visitId: req.visitId,
        patientId: req.patientId,
        reviewedBy: auth.id,
        indicationCompliant,
        dosageCompliant: dos.reasonable,
        preTestComplete: pre.complete,
        efficacyGrade,
        conclusion: verdict.conclusion,
        issues,
        conclusionNote: input.conclusionNote ?? null,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'blood.utilization',
        resourceType: 'transfusion',
        resourceId: req.id,
        result: 'success',
        riskLevel: 'medium',
        detail: { conclusion: verdict.conclusion, created },
      },
      tx,
    );
    return { review, created };
  });
}

// ---------------------------------------------------------------------------
// 3. 等级评审质控指标
// ---------------------------------------------------------------------------

export async function getQualityMetrics(
  auth: AuthView,
  input: { from: string; to: string },
): Promise<{
  period: { from: string; to: string };
  inpatientDischarges: number;
  totalRequests: number;
  metrics: BloodQualityMetrics;
}> {
  assertPermission(auth, 'blood:audit');
  if (!input.from || !input.to) throw badRequest('起止时间不能为空');
  const db = getDb();

  const reqRows = await db`
    SELECT
      r.patient_id, r.component,
      t.status AS t_status,
      u.conclusion, u.pre_test_complete,
      e.efficacy_grade,
      (SELECT count(*) FROM clinical.blood_transfusion_reactions br
         WHERE br.transfusion_id = t.id) AS reaction_count
    FROM clinical.blood_transfusion_requests r
    LEFT JOIN clinical.blood_transfusions t ON t.request_id = r.id
    LEFT JOIN clinical.blood_utilization_reviews u ON u.request_id = r.id
    LEFT JOIN clinical.transfusion_efficacy_assessments e ON e.transfusion_id = t.id
    WHERE r.created_at >= ${input.from} AND r.created_at < ${input.to}`;

  const rows = (reqRows as Record<string, unknown>[]).map((r) => ({
    patientId: String(r.patient_id),
    isComponent: String(r.component) !== 'whole',
    reviewed: r.conclusion !== null && r.conclusion !== undefined,
    conclusion: (r.conclusion as UtilizationConclusion | null) ?? null,
    preTestComplete: Boolean(r.pre_test_complete),
    hasReaction: Number(r.reaction_count) > 0,
    efficacyAssessed: r.efficacy_grade !== null && r.efficacy_grade !== undefined,
    completed: String(r.t_status) === 'completed',
  }));

  // 周期内出院住院人数（住院输血率分母）
  const discharges = await db`
    SELECT count(*)::int AS n FROM clinical.admissions
    WHERE status = 'discharged'
      AND discharged_at >= ${input.from} AND discharged_at < ${input.to}`;
  const inpatientDischarges = Number((discharges[0] as Record<string, unknown>).n) || 0;

  return {
    period: { from: input.from, to: input.to },
    inpatientDischarges,
    totalRequests: rows.length,
    metrics: computeQualityMetrics(rows, inpatientDischarges),
  };
}

// ---------------------------------------------------------------------------
// 4. 视图查询
// ---------------------------------------------------------------------------

export async function listEfficacyView(filter: { grade?: string } = {}) {
  return listEfficacy(filter);
}

export async function listUtilizationView(filter: { conclusion?: string } = {}) {
  return listUtilization(filter);
}

export async function getBloodQualityDetail(requestId: string) {
  assertUuid(requestId, '输血申请');
  const req = await getById(requestId);
  if (!req) throw notFound('输血申请不存在');
  const transfusion = await getTransfusionByRequest(requestId);
  const efficacy = transfusion
    ? await getEfficacyByTransfusion(String(transfusion.id))
    : null;
  const utilization = await getUtilizationByRequest(requestId);
  return { req, transfusion, efficacy, utilization };
}
