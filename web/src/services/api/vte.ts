/**
 * 健澜科技 jlmedaios - VTE 智能防治 API（M13-A）
 *
 * 真实 BFF（src/bff/routes/vte.ts），全部读写 PostgreSQL，无 mock。
 * 路径相对（baseURL 已含 /api/v1），禁止再带 /api/v1 前缀。
 *
 * 医疗安全：AI 不自主诊断/开抗凝药；药物预防一律 suggested，须医师 vte:prevent 确认签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  VteAssessment,
  VteEventType,
  VteHighRiskItem,
  VteMetricsResponse,
  VteOccasion,
  VteOutcome,
  VtePrevention,
  VtePreventionCategory,
  VtePreventionMethod,
  VteScale,
  VteVisitDetail,
} from '@/types/vte';

/* ------------------------------ 风险评估 ------------------------------- */

export interface AssessVteBody {
  visitId: string;
  scale: VteScale;
  occasion: VteOccasion;
  vteFactorKeys: string[];
  bleedingFactorKeys: string[];
  note?: string;
}

/** 提交风险评估：后端自动算分/分层、生成建议性预防措施草稿、高危 alert_raised。 */
export function assessVte(body: AssessVteBody): Promise<VteAssessment> {
  return post<VteAssessment>('/vte/assessments', body);
}

/** 评估列表（可按 visitId / vteLevel / occasion 过滤）。 */
export function listAssessments(params?: {
  visitId?: string;
  vteLevel?: string;
  occasion?: string;
}): Promise<VteAssessment[]> {
  return get<VteAssessment[]>('/vte/assessments', {
    ...(params?.visitId ? { visitId: params.visitId } : {}),
    ...(params?.vteLevel ? { vteLevel: params.vteLevel } : {}),
    ...(params?.occasion ? { occasion: params.occasion } : {}),
  });
}

/** 高危/极高危患者看板：各 visit 最新评估。 */
export function listHighRisk(): Promise<VteHighRiskItem[]> {
  return get<VteHighRiskItem[]>('/vte/high-risk');
}

/** 质控指标（应用层实时聚合）。 */
export function getVteMetrics(from: string, to: string): Promise<VteMetricsResponse> {
  return get<VteMetricsResponse>(`/vte/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

/** 单就诊全详情：评估历史 + 预防 + 结局。 */
export function getVisitDetail(visitId: string): Promise<VteVisitDetail> {
  return get<VteVisitDetail>(`/vte/visits/${visitId}`);
}

/** 单条评估。 */
export function getAssessment(id: string): Promise<VteAssessment> {
  return get<VteAssessment>(`/vte/assessments/${id}`);
}

/* ------------------------------ 预防措施 ------------------------------- */

export interface NewPreventionBody {
  visitId: string;
  category: VtePreventionCategory;
  method: VtePreventionMethod;
  dosage?: string;
  frequency?: string;
}

/** 手工新增预防措施（suggested）。 */
export function addPrevention(body: NewPreventionBody): Promise<VtePrevention> {
  return post<VtePrevention>('/vte/preventions', body);
}

/** 预防措施列表（可按 visitId / status / category 过滤）。 */
export function listPreventions(params?: {
  visitId?: string;
  status?: string;
  category?: string;
}): Promise<VtePrevention[]> {
  return get<VtePrevention[]>('/vte/preventions', {
    ...(params?.visitId ? { visitId: params.visitId } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.category ? { category: params.category } : {}),
  });
}

/**
 * 医师确认药物预防（需 vte:prevent）：生成用药医嘱并走审方/CDS。
 * 高出血风险下默认 409 拦截，须显式 overrideReason。
 */
export function confirmPrevention(id: string, overrideReason?: string): Promise<VtePrevention> {
  return post<VtePrevention>(`/vte/preventions/${id}/confirm`, {
    overrideReason: overrideReason ?? null,
  });
}

/** 护士执行机械预防（需 vte:execute）：创建/完成护理任务。 */
export function executePrevention(id: string): Promise<VtePrevention> {
  return post<VtePrevention>(`/vte/preventions/${id}/execute`, {});
}

/** 标记禁忌/暂缓（留原因）。 */
export function contraindicatePrevention(id: string, reason: string): Promise<VtePrevention> {
  return post<VtePrevention>(`/vte/preventions/${id}/contraindicate`, { reason });
}

/* ------------------------------ 结局/不良事件 --------------------------- */

export interface RecordOutcomeBody {
  visitId: string;
  eventType: VteEventType;
  severity?: string;
  source?: 'hospital_acquired' | 'present_on_admission';
  imagingReportId?: string;
  labResultId?: string;
  description?: string;
  occurredAt?: string;
}

/** 记录 DVT/PE/出血/抗凝不良事件。 */
export function recordOutcome(body: RecordOutcomeBody): Promise<VteOutcome> {
  return post<VteOutcome>('/vte/outcomes', body);
}

/** 结局列表（可按 visitId / eventType 过滤）。 */
export function listOutcomes(params?: {
  visitId?: string;
  eventType?: string;
}): Promise<VteOutcome[]> {
  return get<VteOutcome[]>('/vte/outcomes', {
    ...(params?.visitId ? { visitId: params.visitId } : {}),
    ...(params?.eventType ? { eventType: params.eventType } : {}),
  });
}

/* ---------------------- 可选 LLM 危险因素抽取（默认关闭） ---------------- */

export interface ExtractFactorsBody {
  visitId: string;
  scale: VteScale;
  text: string;
}

/**
 * 可选 LLM 从病历抽取危险因素（可插拔/默认关闭）。
 * 抽取结果永远是"待确认"，评估人须逐项确认后才计分；不进入核心闭环必需路径。
 */
export function extractFactors(body: ExtractFactorsBody): Promise<{ factorKeys: string[] }> {
  return post<{ factorKeys: string[] }>('/vte/extract-factors', body);
}
