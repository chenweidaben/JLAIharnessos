/**
 * 健澜科技 jlmedaios - 老年健康 V2 纯函数（M221-C）
 *
 * buildGeriatricsReportV2 / assessFrailty / screenPolypharmacy
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估衰弱（纯函数）。
 *
 * @param criteria 满足衰弱标准数
 * @returns 衰弱等级
 */
export function assessFrailty(criteria: number): { level: string; frail: boolean } {
  let level = '健康';
  if (criteria >= 3) level = '衰弱';
  else if (criteria >= 1) level = '衰弱前期';
  return { level, frail: criteria >= 3 };
}

/**
 * 筛查多重用药（纯函数）。
 *
 * @param medications 药物数
 * @returns 是否多重用药
 */
export function screenPolypharmacy(medications: number): { poly: boolean; pim: number } {
  return { poly: medications >= 5, pim: Math.max(0, medications - 5) };
}

/** 老年健康 V2 报告输出 */
export interface GeriatricsReportV2 {
  timeRange: string;
  cga: { assessed: number };
  syndrome: { fall: number; pressureUlcer: number; dementia: number; delirium: number; frailty: number };
  chronic: { comorbidity: number };
  medication: { polypharmacy: number };
  rehab: { adl: number; iadl: number };
  cognition: { mmse: number; moca: number };
  psych: { depression: number };
  management: { care: number };
  suggestions: string[];
}

/**
 * 构建老年健康 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 老年健康 V2 报告
 */
export function buildGeriatricsReportV2(timeRange: string): GeriatricsReportV2 {
  return {
    timeRange,
    cga: { assessed: 500 },
    syndrome: { fall: 30, pressureUlcer: 15, dementia: 40, delirium: 10, frailty: 60 },
    chronic: { comorbidity: 800 },
    medication: { polypharmacy: 200 },
    rehab: { adl: 100, iadl: 80 },
    cognition: { mmse: 300, moca: 200 },
    psych: { depression: 50 },
    management: { care: 150 },
    suggestions: ['推广 CGA 评估', '减少多重用药'],
  };
}
