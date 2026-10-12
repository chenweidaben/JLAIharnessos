/**
 * 健澜科技 jlmedaios - 月度结算报表前端类型（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface SummaryRow {
  id: string; period: string;
  drgCases: number; dipCases: number;
  totalScore: number; pointValue: number;
  insuranceSettlement: number; patientOutOfPocket: number;
}
