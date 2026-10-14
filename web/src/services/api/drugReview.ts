/**
 * 健澜科技 jlmedaios - 合理用药实时审查 API（AI 第八剑客）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';

export type DrugReviewLevel = 'info' | 'warning' | 'critical';

export interface DrugReviewIssue {
  rule: string;
  level: DrugReviewLevel;
  /** 药名（禁忌组合为 "A + B"） */
  drug: string;
  /** 类别：配伍禁忌 / 抗菌药物越级使用 / 重复用药 */
  category: string;
  /** 处置建议 */
  suggestion: string;
}

export interface DrugReviewResult {
  visitId: string;
  scannedAt: string;
  orderCount: number;
  issueCount: number;
  /** 是否存在抗菌药越级医嘱（前端醒目 Alert 用） */
  hasEscalation: boolean;
  issues: DrugReviewIssue[];
}

/** 触发一次在院医嘱实时审查（visitId 走 query） */
export function scanDrugReview(visitId: string): Promise<DrugReviewResult> {
  return post<DrugReviewResult>(`/drug-review/scan?visitId=${encodeURIComponent(visitId)}`);
}

/** 实时读取当前在院医嘱审查结果（与 scan 同口径，不落库） */
export function getDrugReview(visitId: string): Promise<DrugReviewResult> {
  return get<DrugReviewResult>('/drug-review', { visitId });
}
