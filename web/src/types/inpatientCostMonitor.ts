/**
 * 健澜科技 jlmedaios - 在院费用监控前端类型（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface MonitorItem {
  id: string;
  visitId: string;
  groupCode: string | null;
  budgetCost: string | null;
  budgetBasis: 'drg' | 'dip';
  accumulatedCost: string;
  ratio: string | null;
  level: 'ok' | 'warn' | 'over';
  dischargeReviewReminded: boolean;
  lastSnapshotAt: string;
}
