/**
 * 健澜科技 jlmedaios - 医生个人月度成长报告 V13 纯函数（M310-C）
 *
 * buildMonthlyGrowthReportV13 / computeMoMGrowthV13 / identifyGrowthMilestoneV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 月度成长数据 */
export interface MonthlyGrowthDataV13 {
  tasksDone: number;
  suggestionsAdopted: number;
  sopReferences: number;
  badgeDelta: number;
}

/** 成长月报 */
export interface GrowthReportV13 extends MonthlyGrowthDataV13 {
  doctorId: string;
  month: string;
}

/**
 * 构建月报（纯函数）。
 *
 * @param doctorId 医生 ID
 * @param month 月份 YYYY-MM
 * @param monthData 月度数据
 * @returns 月报
 */
export function buildMonthlyGrowthReportV13(
  doctorId: string,
  month: string,
  monthData: MonthlyGrowthDataV13,
): GrowthReportV13 {
  return { doctorId, month, ...monthData };
}

/**
 * 环比增长（纯函数）：this - last，单位 pp。
 *
 * @param thisMonth 本月
 * @param lastMonth 上月
 * @returns 差值
 */
export function computeMoMGrowthV13(thisMonth: number, lastMonth: number): number {
  return thisMonth - lastMonth;
}

/**
 * 成长里程碑（纯函数）：环比 > 20 → "本月成长显著"，否则 "平稳"。
 *
 * @param momGrowth 环比 pp
 * @returns 里程碑描述
 */
export function identifyGrowthMilestoneV13(momGrowth: number): string {
  if (momGrowth > 20) return "本月成长显著";
  return "平稳";
}
