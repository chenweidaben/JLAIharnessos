/**
 * 健澜科技 jlmedaios - 结算分析前端类型（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface AnalyticPoint {
  period: string;
  settlementMoM: number | null;
  settlementTrend: 'up' | 'down' | 'flat' | 'na';
  drgRatio: number; dipRatio: number;
  drugShare: number; materialShare: number; examShare: number;
}
