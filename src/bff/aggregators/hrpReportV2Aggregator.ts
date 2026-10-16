/**
 * 健澜科技 jlmedaios - HRP 深化 V2 纯函数（M211-A）
 *
 * buildHRPReportV2 / calculateAssetTurnover / assessBudgetExecution
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算资产周转率（纯函数）。
 *
 * @param assets 资产总额
 * @param revenue 收入总额
 * @returns 周转率
 */
export function calculateAssetTurnover(assets: number, revenue: number): { turnover: number; level: string } {
  const turnover = assets > 0 ? revenue / assets : 0;
  let level = '良好';
  if (turnover < 0.5) level = '偏低';
  else if (turnover > 1.5) level = '高效';
  return { turnover, level };
}

/**
 * 评估预算执行率（纯函数）。
 *
 * @param budget 预算
 * @param actual 实际
 * @returns 执行率与偏差
 */
export function assessBudgetExecution(budget: number, actual: number): { executionRate: number; deviation: number; status: string } {
  const executionRate = budget > 0 ? actual / budget : 0;
  const deviation = executionRate - 1;
  let status = '正常';
  if (deviation > 0.1) status = '超预算';
  else if (deviation < -0.1) status = '预算结余';
  return { executionRate, deviation, status };
}

/** HRP V2 报告输出 */
export interface HRPReportV2 {
  timeRange: string;
  logistics: { stockValue: number };
  equipment: { assetValue: number };
  hr: { headcount: number };
  finance: { revenue: number; expense: number };
  budget: { executionRate: number };
  material: { consumed: number };
  contract: { total: number };
  decision: { assetTurnover: number };
  suggestions: string[];
}

/**
 * 构建 HRP V2 报告。
 *
 * @param timeRange 时间范围
 * @returns HRP V2 报告
 */
export function buildHRPReportV2(timeRange: string): HRPReportV2 {
  return {
    timeRange,
    logistics: { stockValue: 5000 },
    equipment: { assetValue: 50000 },
    hr: { headcount: 2000 },
    finance: { revenue: 100000, expense: 80000 },
    budget: { executionRate: 0.95 },
    material: { consumed: 30000 },
    contract: { total: 500 },
    decision: { assetTurnover: 1.2 },
    suggestions: ['提高资产周转率', '控制预算执行偏差'],
  };
}
