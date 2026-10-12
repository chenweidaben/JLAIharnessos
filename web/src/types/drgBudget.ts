/**
 * 健澜科技 jlmedaios - DRG 预算预警前端类型（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface BudgetItem {
  id: string;
  groupCode: string;
  version: string;
  expectedCost: string;
  warningRatio: string;
}
export interface AlertItem {
  id: string;
  groupCode: string;
  actualCost: string | null;
  ratio: string | null;
  level: string;
  acknowledged: boolean;
  createdAt: string;
}
