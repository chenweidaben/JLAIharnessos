/**
 * 健澜科技 jlmedaios - 住院管理 V2 纯函数（M225-B）
 *
 * buildInpatientReportV2 / assessBedUtilization / calculateLOS
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估床位使用率（纯函数）。
 *
 * @param beds 总床位数
 * @param occupied 占用床位数
 * @returns 使用率评级
 */
export function assessBedUtilization(beds: number, occupied: number): { rate: number; level: string } {
  const rate = beds > 0 ? Math.round((occupied / beds) * 1000) / 10 : 0;
  let level = '合理';
  if (rate > 100) level = '超负荷';
  else if (rate < 80) level = '偏低';
  return { rate, level };
}

/**
 * 计算平均住院日（纯函数）。
 *
 * @param admission 入院日期（天）
 * @param discharge 出院日期（天）
 * @returns LOS
 */
export function calculateLOS(admission: number, discharge: number): { days: number; normal: boolean } {
  const days = discharge - admission;
  return { days, normal: days <= 10 };
}

/** 住院管理 V2 报告输出 */
export interface InpatientReportV2 {
  timeRange: string;
  admission: { registered: number };
  bed: { total: number; occupied: number; turnover: number };
  treatment: { rounds: number; consult: number; transfer: number };
  nursing: { qualified: number };
  medication: { reviewed: number };
  cost: { average: number };
  discharge: { settled: number; followup: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建住院管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 住院管理 V2 报告
 */
export function buildInpatientReportV2(timeRange: string): InpatientReportV2 {
  return {
    timeRange,
    admission: { registered: 8000 },
    bed: { total: 1200, occupied: 1100, turnover: 6.5 },
    treatment: { rounds: 24000, consult: 800, transfer: 300 },
    nursing: { qualified: 7800 },
    medication: { reviewed: 15000 },
    cost: { average: 12000 },
    discharge: { settled: 7900, followup: 5000 },
    management: { satisfaction: 90 },
    suggestions: ['缩短平均住院日', '提高床位周转'],
  };
}
