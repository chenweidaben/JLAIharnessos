/**
 * 健澜科技 jlmedaios - 结算下钻前端类型（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface DrillRow {
  key: string; label: string; cases: number; settlementTotal: number;
  overspendRate: number; drugRatio: number;
}
export interface DrilldownResult {
  byDepartment: DrillRow[];
  byDoctor: DrillRow[];
}
