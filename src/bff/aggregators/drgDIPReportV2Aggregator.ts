/**
 * 健澜科技 jlmedaios - DRG/DIP V2 纯函数（M230-C）
 *
 * buildDRGDIPReportV2 / calculateDRGProfit / assessCMI
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算 DRG 盈亏（纯函数）。
 *
 * @param group DRG 组数
 * @param cost 成本
 * @param payment 支付额
 * @returns 盈亏
 */
export function calculateDRGProfit(group: string, cost: number, payment: number): { profit: number; status: string } {
  const profit = Math.round((payment - cost) * 100) / 100;
  let status = '盈余';
  if (profit < 0) status = '亏损';
  return { profit, status };
}

/**
 * 评估 CMI（纯函数）。
 *
 * @param cases 病例数
 * @param weights 权重和
 * @returns CMI 值
 */
export function assessCMI(cases: number, weights: number): { cmi: number; level: string } {
  const cmi = cases > 0 ? Math.round(weights * 100 / cases) / 100 : 0;
  let level = '中等';
  if (cmi >= 1.2) level = '高';
  else if (cmi < 0.8) level = '低';
  return { cmi, level };
}

/** DRG/DIP V2 报告输出 */
export interface DRGDIPReportV2 {
  timeRange: string;
  drg: { mdcs: number; adrgs: number; groups: number };
  dip: { coreDiseases: number; points: number };
  cost: { diseaseCost: number };
  profit: { ratio: number };
  cmi: { value: number };
  structure: { topDiseases: number };
  coding: { accuracy: number };
  pathway: { coverage: number };
  suggestions: string[];
}

/**
 * 构建 DRG/DIP V2 报告。
 *
 * @param timeRange 时间范围
 * @returns DRG/DIP V2 报告
 */
export function buildDRGDIPReportV2(timeRange: string): DRGDIPReportV2 {
  return {
    timeRange,
    drg: { mdcs: 26, adrgs: 350, groups: 600 },
    dip: { coreDiseases: 100, points: 50000 },
    cost: { diseaseCost: 8000 },
    profit: { ratio: 95 },
    cmi: { value: 1.1 },
    structure: { topDiseases: 20 },
    coding: { accuracy: 95 },
    pathway: { coverage: 60 },
    suggestions: ['提升病案编码质量', '优化病种成本结构'],
  };
}
