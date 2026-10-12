/**
 * 健澜科技 jlmedaios - 整改效果回看前端类型（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface OutcomeReview {
  id: string;
  taskId: string;
  baselineVisits: number;
  baselineOverspendRate: string;
  followupVisits: number;
  followupOverspendRate: string;
  followupReadmitRate: string;
  verdict: string;
  evaluatedAt: string | null;
}
