/**
 * 健澜科技 jlmedaios - 住院压疮(Braden)/跌倒(Morse)风险预警聚合器（M17-A）
 *
 * 风险评估 + 预防建议/确认/执行（本人签名） + 结局事件登记 + NQI 指标。
 * 分层与建议全部委托确定性规则引擎（riskWarning.ts，复用 mobileNursing 打分），
 * 本层负责取数、状态校验、数据范围(canAccessVisit)、医疗安全红线与哈希链审计。
 *
 * 医疗安全红线：
 *  - AI 不自主开医嘱：评估只生成 suggested 预防草稿；护士须本人 accepted -> executed
 *    并电子签名（signature）才视为已落实；executed 可联动既有护理任务（护士本人完成）；
 *  - 高危评估且无 executed 预防 => 高危看板预警（accepted 未执行仍预警）；
 *  - 评估/建议为辅助决策，最终护理措施由责任护士本人执行并签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import {
  createNursingTask,
  executeNursingTask,
} from '../../db/repositories/nursingRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  createAssessment,
  getAssessmentById,
  listAssessments,
  listHighRiskLatest,
  createPrevention,
  getPreventionById,
  listPreventions,
  acceptPrevention,
  executePrevention,
  cancelPrevention,
  createEvent,
  listEvents,
  type NursingRiskAssessment,
  type NursingRiskPrevention,
  type NursingRiskEvent,
  type RiskEventType,
} from '../../db/repositories/nursingRiskRepo.js';
import {
  scorePressureUlcer,
  scoreFall,
  classifyLevel,
  recommendPreventions,
  detectNoPrevention,
  computeRiskMetrics,
  type RiskType,
  type RiskLevel,
  type PreventionMeasure,
  type RiskMetricRow,
  type RiskMetrics,
} from '../../medical-tools/nursing/riskWarning.js';
import type { BradenAnswers, MorseAnswers } from '../../medical-tools/nursing/mobileNursing.js';

export class NursingRiskError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NursingRiskError';
  }
}
const badRequest = (m: string) => new NursingRiskError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new NursingRiskError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new NursingRiskError(409, 'CONFLICT', m);
const forbidden = (m: string) => new NursingRiskError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为用户 UUID`);
}

/** 加载就诊并校验数据范围（越权 403，不存在 404）。 */
async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) {
    throw forbidden('超出数据权限范围，无法操作该患者');
  }
  return visit;
}

// ---------------------------------------------------------------------------
// 1. 风险评估（自动算分/分层，生成建议性预防草稿）
// ---------------------------------------------------------------------------

export interface AssessInput {
  visitId: string;
  riskType: RiskType;
  /** Braden 或 Morse 各条目原始打分（透传自前端表单） */
  items: Record<string, number>;
  note?: string;
}

export interface AssessResult {
  assessment: NursingRiskAssessment;
  suggestedPreventions: NursingRiskPrevention[];
  warning: { warning: boolean; reason: string };
}

export async function assessRisk(auth: AuthView, input: AssessInput): Promise<AssessResult> {
  assertPermission(auth, 'nursing_risk:assess');
  assertUuid(input.visitId, '就诊');
  if (input.riskType !== 'pressure_ulcer' && input.riskType !== 'fall') {
    throw badRequest('riskType 须为 pressure_ulcer 或 fall');
  }
  const visit = await loadVisit(auth, input.visitId);

  // 复用 PDA 量表打分（不重写规则），再映射到入库三档
  const totalScore = input.riskType === 'pressure_ulcer'
    ? scorePressureUlcer(input.items as unknown as BradenAnswers)
    : scoreFall(input.items as unknown as MorseAnswers);
  const level: RiskLevel = classifyLevel(input.riskType, totalScore);
  const rec: PreventionMeasure[] = recommendPreventions(input.riskType, level);

  return withTx(async (tx) => {
    const assessment = await createAssessment(
      {
        visitId: visit.id,
        riskType: input.riskType,
        items: input.items ?? {},
        totalScore,
        level,
        note: input.note ?? null,
        assessedBy: auth.id,
      },
      tx,
    );

    // 生成建议性预防草稿（一律 suggested；护士确认/执行并签名）
    const suggested: NursingRiskPrevention[] = [];
    for (const m of rec) {
      suggested.push(
        await createPrevention(
          { assessmentId: assessment.id, measureCode: m.measureCode, measureDesc: m.measureDesc },
          tx,
        ),
      );
    }

    const warning = detectNoPrevention([
      {
        assessmentId: assessment.id,
        visitId: visit.id,
        riskType: input.riskType,
        level,
        totalScore,
        preventions: suggested.map((s) => ({ status: s.status })),
      },
    ])[0];

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'nursing_risk.assess',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: level === 'high' ? 'high' : level === 'medium' ? 'medium' : 'low',
        detail: { riskType: input.riskType, score: totalScore, level, suggested: suggested.length },
      },
      tx,
    );

    return {
      assessment,
      suggestedPreventions: suggested,
      warning: warning ? { warning: true, reason: warning.reason } : { warning: false, reason: '' },
    };
  });
}

// ---------------------------------------------------------------------------
// 2. 查询
// ---------------------------------------------------------------------------

export async function listAssessmentsView(
  auth: AuthView,
  filter: { visitId?: string; riskType?: string; level?: string },
) {
  assertPermission(auth, 'nursing_risk:read');
  return listAssessments(filter);
}

export async function getAssessmentView(auth: AuthView, id: string) {
  assertPermission(auth, 'nursing_risk:read');
  assertUuid(id, '评估');
  const a = await getAssessmentById(id);
  if (!a) throw notFound('评估记录不存在');
  return a;
}

/** 高危看板：各 (visit,risk_type) 最新 high 评估 + 是否已有 executed 预防。 */
export async function getHighRiskBoard(auth: AuthView) {
  assertPermission(auth, 'nursing_risk:read');
  const rows = await listHighRiskLatest();
  const scoped = [];
  for (const a of rows) {
    const visit = await getVisitById(a.visitId);
    if (!visit) continue;
    if (!canAccessVisit(auth, visit)) continue;
    scoped.push(a);
  }
  const out = [];
  for (const a of scoped) {
    const prevs = await listPreventions({ assessmentId: a.id });
    const w = detectNoPrevention([
      { assessmentId: a.id, visitId: a.visitId, riskType: a.riskType, level: a.level, totalScore: a.totalScore, preventions: prevs.map((p) => ({ status: p.status })) },
    ])[0];
    out.push({ assessment: a, warning: w ? { warning: true, reason: w.reason } : { warning: false, reason: '' } });
  }
  return out;
}

/** 单就诊全详情：评估历史 + 预防 + 事件 + 预警。 */
export async function getVisitDetail(auth: AuthView, visitId: string) {
  assertPermission(auth, 'nursing_risk:read');
  assertUuid(visitId, '就诊');
  const visit = await loadVisit(auth, visitId);
  const assessments = await listAssessments({ visitId });
  const preventions = await listPreventions({ visitId });
  const events = await listEvents({ visitId });
  const warnings = detectNoPrevention(
    assessments.map((a) => ({
      assessmentId: a.id,
      visitId: a.visitId,
      riskType: a.riskType,
      level: a.level,
      totalScore: a.totalScore,
      preventions: preventions.filter((p) => p.assessmentId === a.id).map((p) => ({ status: p.status })),
    })),
  );
  return {
    visit: { id: visit.id, patientId: visit.patientId, department: visit.department },
    assessments, preventions, events, warnings,
  };
}

// ---------------------------------------------------------------------------
// 3. 预防措施状态机（护士确认/执行/签名）
// ---------------------------------------------------------------------------

export async function listPreventionsView(
  auth: AuthView,
  filter: { visitId?: string; assessmentId?: string; status?: string },
) {
  assertPermission(auth, 'nursing_risk:read');
  return listPreventions(filter);
}

/** 护士确认：suggested -> accepted。 */
export async function acceptPreventionView(auth: AuthView, id: string): Promise<NursingRiskPrevention> {
  assertPermission(auth, 'nursing_risk:execute');
  assertUuid(id, '预防措施');
  const prevention = await getPreventionById(id);
  if (!prevention) throw notFound('预防措施不存在');
  const assess = await getAssessmentById(prevention.assessmentId);
  if (!assess) throw notFound('关联评估不存在');
  await loadVisit(auth, assess.visitId);
  return withTx(async (tx) => {
    const accepted = await acceptPrevention(prevention.id, tx);
    if (!accepted) throw conflict(`预防措施状态为 ${prevention.status}，不可重复确认`);
    await recordChainAudit(
      { actorId: auth.id, action: 'nursing_risk.prevent.accept', resourceType: 'visit', resourceId: assess.visitId, result: 'success', riskLevel: 'medium', detail: { preventionId: accepted.id, measureCode: accepted.measureCode } },
      tx,
    );
    return accepted;
  });
}

/**
 * 护士执行并本人签名：accepted -> executed。
 * 可联动既有护理任务：创建护理任务并由执行护士本人完成（签名一致）。
 */
export async function executePreventionView(
  auth: AuthView,
  id: string,
  input: { signature?: string },
): Promise<{ prevention: NursingRiskPrevention; nursingTaskId: string | null }> {
  assertPermission(auth, 'nursing_risk:execute');
  assertUuid(id, '预防措施');
  const signature = (input.signature ?? '').trim();
  if (!signature) throw badRequest('执行须由护士本人签名（signature 不能为空）');

  const prevention = await getPreventionById(id);
  if (!prevention) throw notFound('预防措施不存在');
  const assess = await getAssessmentById(prevention.assessmentId);
  if (!assess) throw notFound('关联评估不存在');
  const visit = await loadVisit(auth, assess.visitId);
  if (prevention.status !== 'accepted') {
    throw conflict(`预防措施状态为 ${prevention.status}，须先确认(accepted)后方可执行`);
  }

  return withTx(async (tx) => {
    // 联动既有护理任务：护士本人完成并签名
    const task = await createNursingTask(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        taskType: 'other',
        content: `护理风险预防执行：${prevention.measureDesc}`,
        idempotencyKey: `nursing-risk-prev-${prevention.id}`,
      },
      tx as DbExecutor,
    );
    const done = await executeNursingTask(task.id, auth.id, `风险预防已执行并签名：${prevention.measureCode}`, tx as DbExecutor);
    if (!done) throw conflict('护理任务执行失败（状态已变更）');

    const executed = await executePrevention(prevention.id, auth.id, signature, tx);
    if (!executed) throw conflict('预防措施执行失败（状态已变更）');

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'nursing_risk.prevent.execute',
        resourceType: 'visit',
        resourceId: visit.id,
        result: 'success',
        riskLevel: 'medium',
        detail: { preventionId: executed.id, nursingTaskId: task.id, measureCode: executed.measureCode },
      },
      tx,
    );
    return { prevention: executed, nursingTaskId: task.id };
  });
}

/** 取消未落实的预防措施。 */
export async function cancelPreventionView(auth: AuthView, id: string): Promise<NursingRiskPrevention> {
  assertPermission(auth, 'nursing_risk:execute');
  assertUuid(id, '预防措施');
  const prevention = await getPreventionById(id);
  if (!prevention) throw notFound('预防措施不存在');
  const assess = await getAssessmentById(prevention.assessmentId);
  if (!assess) throw notFound('关联评估不存在');
  await loadVisit(auth, assess.visitId);
  return withTx(async (tx) => {
    const cancelled = await cancelPrevention(prevention.id, tx);
    if (!cancelled) throw conflict(`预防措施状态为 ${prevention.status}，不可取消`);
    await recordChainAudit(
      { actorId: auth.id, action: 'nursing_risk.prevent.cancel', resourceType: 'visit', resourceId: assess.visitId, result: 'success', riskLevel: 'low', detail: { preventionId: cancelled.id, measureCode: cancelled.measureCode } },
      tx,
    );
    return cancelled;
  });
}

// ---------------------------------------------------------------------------
// 4. 结局 / 不良事件登记
// ---------------------------------------------------------------------------

const PRESSURE_EVENTS: RiskEventType[] = ['pressure_injury_stage2', 'pressure_injury_stage3', 'pressure_injury_stage4'];
const FALL_EVENTS: RiskEventType[] = ['fall'];

export async function recordEventView(
  auth: AuthView,
  input: { visitId: string; eventType: RiskEventType; description?: string; occurredAt?: string },
): Promise<NursingRiskEvent> {
  assertPermission(auth, 'nursing_risk:execute');
  assertUuid(input.visitId, '就诊');
  const visit = await loadVisit(auth, input.visitId);
  let riskType: RiskType;
  if (PRESSURE_EVENTS.includes(input.eventType)) {
    riskType = 'pressure_ulcer';
  } else if (FALL_EVENTS.includes(input.eventType)) {
    riskType = 'fall';
  } else {
    throw badRequest('eventType 取值非法');
  }

  return withTx(async (tx) => {
    const event = await createEvent(
      {
        visitId: visit.id,
        riskType,
        eventType: input.eventType,
        description: input.description ?? null,
        recordedBy: auth.id,
        occurredAt: input.occurredAt ?? null,
      },
      tx,
    );
    await recordChainAudit(
      { actorId: auth.id, action: 'nursing_risk.event', resourceType: 'visit', resourceId: visit.id, result: 'success', riskLevel: 'high', detail: { eventId: event.id, eventType: event.eventType } },
      tx,
    );
    return event;
  });
}

export async function listEventsView(
  auth: AuthView,
  filter: { visitId?: string; riskType?: string; eventType?: string },
) {
  assertPermission(auth, 'nursing_risk:read');
  return listEvents(filter);
}

// ---------------------------------------------------------------------------
// 5. NQI 指标（高危率 / 事件发生率，含分子分母）
// ---------------------------------------------------------------------------

export async function getRiskMetrics(
  auth: AuthView,
  input: { from: string; to: string },
): Promise<{ period: { from: string; to: string }; totalVisits: number; metrics: RiskMetrics }> {
  assertPermission(auth, 'nursing_risk:read');
  if (!input.from || !input.to) throw badRequest('起止时间不能为空');
  const db = getDb();

  const rows = await db`
    WITH base AS (
      SELECT v.id AS visit_id,
        (SELECT a.level FROM clinical.nursing_risk_assessments a
          WHERE a.visit_id = v.id AND a.risk_type = 'pressure_ulcer'
          ORDER BY a.assessed_at DESC, a.created_at DESC LIMIT 1) AS pressure_level,
        (SELECT a.level FROM clinical.nursing_risk_assessments a
          WHERE a.visit_id = v.id AND a.risk_type = 'fall'
          ORDER BY a.assessed_at DESC, a.created_at DESC LIMIT 1) AS fall_level,
        (SELECT count(*) FROM clinical.nursing_risk_preventions p
          JOIN clinical.nursing_risk_assessments a ON a.id = p.assessment_id
          WHERE a.visit_id = v.id AND a.risk_type = 'pressure_ulcer' AND p.status = 'executed') AS pressure_executed,
        (SELECT count(*) FROM clinical.nursing_risk_preventions p
          JOIN clinical.nursing_risk_assessments a ON a.id = p.assessment_id
          WHERE a.visit_id = v.id AND a.risk_type = 'fall' AND p.status = 'executed') AS fall_executed,
        (SELECT count(*) FROM clinical.nursing_risk_events e
          WHERE e.visit_id = v.id AND e.risk_type = 'pressure_ulcer') AS pressure_events,
        (SELECT count(*) FROM clinical.nursing_risk_events e
          WHERE e.visit_id = v.id AND e.risk_type = 'fall') AS fall_events
      FROM clinical.visits v
      WHERE v.visit_type = 'inpatient' AND v.created_at >= ${input.from} AND v.created_at < ${input.to}
    )
    SELECT * FROM base`;

  const sources: RiskMetricRow[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    sources.push({
      riskType: 'pressure_ulcer',
      latestLevel: (r.pressure_level as RiskLevel | null) ?? null,
      eventOccurred: Number(r.pressure_events) > 0,
    });
    sources.push({
      riskType: 'fall',
      latestLevel: (r.fall_level as RiskLevel | null) ?? null,
      eventOccurred: Number(r.fall_events) > 0,
    });
  }

  return {
    period: { from: input.from, to: input.to },
    totalVisits: rows.length,
    metrics: computeRiskMetrics(sources, rows.length),
  };
}
