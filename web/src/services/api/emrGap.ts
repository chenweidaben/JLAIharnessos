/**
 * 健澜科技 jlmedaios - EMR 差距分析 API（出院小结 / M87-C 时效 / M87-D 评级自评）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  DischargeSummary,
  DischargeSummaryPayload,
  EmrMetric,
  TimelinessItem,
} from '@/types/emrGap';

// ------------------------------ 出院小结 ------------------------------

/** 按就诊号查询出院小结（不存在时 BFF 返回 404 信封错误） */
export function getDischargeSummary(visitId: string): Promise<DischargeSummary> {
  return get<DischargeSummary>('/discharge-summaries', { visitId });
}

/** 新建 / 更新出院小结（草稿） */
export function upsertDischargeSummary(payload: DischargeSummaryPayload): Promise<DischargeSummary> {
  return post<DischargeSummary>('/discharge-summaries', payload);
}

/** 提交签署（草稿 → 已提交） */
export function submitDischargeSummary(id: string): Promise<DischargeSummary> {
  return post<DischargeSummary>(`/discharge-summaries/${id}/submit`);
}

/** 审核签名（已提交 → 已审核） */
export function verifyDischargeSummary(id: string): Promise<DischargeSummary> {
  return post<DischargeSummary>(`/discharge-summaries/${id}/verify`);
}

// ------------------------------ 文书时效监控（M87-C） ------------------------------

/** 待处理文书台账（仅 pending，按应完成时间升序） */
export function listTimeliness(): Promise<TimelinessItem[]> {
  return get<TimelinessItem[]>('/timeliness');
}

/** 扫描并把已逾期的 pending 置为 late */
export function scanTimeliness(): Promise<TimelinessItem[]> {
  return post<TimelinessItem[]>('/timeliness/scan');
}

// ------------------------------ 电子病历评级自评（M87-D） ------------------------------

/** 全部自评指标 */
export function listEmrAssessment(): Promise<EmrMetric[]> {
  return get<EmrMetric[]>('/emr-assessment');
}

/** 录入某指标实测值，后端据此重算达标状态 */
export function measureEmrMetric(code: string, value: number): Promise<EmrMetric> {
  return post<EmrMetric>(`/emr-assessment/${code}/measure`, { value });
}
