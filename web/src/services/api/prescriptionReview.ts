/**
 * 健澜科技 jlmedaios - 处方点评 API
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';

export type ReviewResult = 'rational' | 'irrational' | 'abnormal';

/** 点评结论中文标签 */
export const RESULT_LABEL: Record<ReviewResult, string> = {
  rational: '合理',
  irrational: '不合理',
  abnormal: '超常',
};

/** 待点评处方（头表摘要） */
export interface PendingPrescription {
  prescriptionId: string;
  rxNo: string;
  visitId: string;
  prescriberId: string | null;
  riskLevel: string | null;
  createdAt: string;
}

/** 一条点评记录 */
export interface PrescriptionReview {
  id: string;
  prescriptionId: string;
  reviewerId: string | null;
  result: ReviewResult;
  resultLabel?: string;
  comment: string | null;
  reviewedAt: string;
}

/** 结果统计（统计卡） */
export interface ReviewStats {
  total: number;
  rational: number;
  irrational: number;
  abnormal: number;
  /** 合理率 0~100 */
  rationalRate: number;
  pending: number;
}

/** 首页数据：待点评列表 + 最近点评 + 统计 */
export interface PrescriptionReviewHome {
  pending: PendingPrescription[];
  recent: PrescriptionReview[];
  stats: ReviewStats;
}

/** 待点评处方列表 + 最近点评 + 结果统计 */
export function getPrescriptionReviewHome(): Promise<PrescriptionReviewHome> {
  return get<PrescriptionReviewHome>('/prescription-review');
}

/** 提交一条点评结论 */
export function submitPrescriptionReview(input: {
  prescriptionId: string;
  result: ReviewResult;
  comment?: string;
}): Promise<PrescriptionReview> {
  return post<PrescriptionReview>('/prescription-review', input);
}
