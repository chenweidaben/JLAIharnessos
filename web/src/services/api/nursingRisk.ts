/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警 API（M17-A）
 *
 * 真实模式直连 BFF（/nursing-risk/*），全部读写 PostgreSQL。
 * 路径一律相对（不带 /api/v1 前缀）；不提供任何本地假数据。
 * BFF/数据库不可用时由 request 层显式抛错，健康门禁在 store/页面统一处理。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  AssessResultView,
  HighRiskBoardItem,
  NursingRiskAssessment,
  NursingRiskEvent,
  NursingRiskPrevention,
  RiskEventType,
  RiskMetricsView,
  RiskType,
  VisitDetailView,
} from '@/types/nursingRisk';

const base = '/nursing-risk';

/* ------------------------------ 评估 ------------------------------ */

/** 登记一次 Braden/Morse 评估（自动分层 + 建议性预防草稿）。 */
export const assessRisk = (payload: {
  visitId: string;
  riskType: RiskType;
  items: Record<string, number>;
  note?: string;
}): Promise<AssessResultView> => post(`${base}/assessments`, payload);

/** 评估列表（可按 visitId/riskType/level 过滤）。 */
export const listAssessments = (params: {
  visitId?: string;
  riskType?: string;
  level?: string;
}): Promise<NursingRiskAssessment[]> => get(`${base}/assessments`, params);

/** 高危预警看板。 */
export const getHighRiskBoard = (): Promise<HighRiskBoardItem[]> => get(`${base}/high-risk`);

/** NQI 高危率/事件发生率。 */
export const getRiskMetrics = (params: { from: string; to: string }): Promise<RiskMetricsView> =>
  get(`${base}/metrics`, params);

/** 单就诊全详情。 */
export const getVisitDetail = (visitId: string): Promise<VisitDetailView> =>
  get(`${base}/visits/${visitId}`);

/* --------------------------- 预防措施 --------------------------- */

/** 预防措施列表（按 visitId/assessmentId/status 过滤）。 */
export const listPreventions = (params: {
  visitId?: string;
  assessmentId?: string;
  status?: string;
}): Promise<NursingRiskPrevention[]> => get(`${base}/preventions`, params);

/** 护士确认：suggested -> accepted。 */
export const acceptPrevention = (id: string): Promise<NursingRiskPrevention> =>
  post(`${base}/preventions/${id}/accept`, {});

/** 护士执行并本人签名：accepted -> executed。 */
export const executePrevention = (
  id: string,
  payload: { signature: string },
): Promise<{ prevention: NursingRiskPrevention; nursingTaskId: string | null }> =>
  post(`${base}/preventions/${id}/execute`, payload);

/** 取消未落实的预防措施。 */
export const cancelPrevention = (id: string): Promise<NursingRiskPrevention> =>
  post(`${base}/preventions/${id}/cancel`, {});

/* --------------------------- 结局事件 --------------------------- */

/** 登记皮肤结局(二期及以上压疮)/跌倒不良事件。 */
export const recordEvent = (payload: {
  visitId: string;
  eventType: RiskEventType;
  description?: string;
  occurredAt?: string;
}): Promise<NursingRiskEvent> => post(`${base}/events`, payload);

/** 事件列表。 */
export const listEvents = (params: {
  visitId?: string;
  riskType?: string;
  eventType?: string;
}): Promise<NursingRiskEvent[]> => get(`${base}/events`, params);
