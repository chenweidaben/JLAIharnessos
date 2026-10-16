/**
 * 健澜科技 jlmedaios - 物价收费 V2 纯函数（M226-B）
 *
 * buildPricingReportV2 / assessPriceCompliance / calculateAverageCost
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估价格合规性（纯函数）。
 *
 * @param items 收费项目数
 * @param standards 符合标准数
 * @returns 合规率
 */
export function assessPriceCompliance(items: number, standards: number): { rate: number; compliant: boolean } {
  const rate = items > 0 ? Math.round((standards / items) * 1000) / 10 : 0;
  return { rate, compliant: rate >= 98 };
}

/**
 * 计算均次费用（纯函数）。
 *
 * @param visits 就诊人次
 * @param revenue 总收入
 * @returns 均次费用
 */
export function calculateAverageCost(visits: number, revenue: number): { average: number } {
  const average = visits > 0 ? Math.round((revenue / visits) * 100) / 100 : 0;
  return { average };
}

/** 物价收费 V2 报告输出 */
export interface PricingReportV2 {
  timeRange: string;
  service: { items: number; adjusted: number };
  drug: { zeroMarkup: boolean };
  consumable: { spd: number; compared: number };
  billing: { regulated: number };
  compliance: { disclosed: number; selfChecked: number };
  revenue: { total: number };
  analysis: { structure: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建物价收费 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 物价收费 V2 报告
 */
export function buildPricingReportV2(timeRange: string): PricingReportV2 {
  return {
    timeRange,
    service: { items: 3000, adjusted: 50 },
    drug: { zeroMarkup: true },
    consumable: { spd: 2000, compared: 1800 },
    billing: { regulated: 50000 },
    compliance: { disclosed: 100, selfChecked: 100 },
    revenue: { total: 200000000 },
    analysis: { structure: 80 },
    management: { satisfaction: 90 },
    suggestions: ['加强价格公示自查', '优化费用结构'],
  };
}
