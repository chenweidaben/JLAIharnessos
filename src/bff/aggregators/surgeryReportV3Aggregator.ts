/**
 * 健澜科技 jlmedaios - 手术麻醉深化 V3 纯函数（M204-B）
 *
 * buildSurgeryReportV3 / assessSurgeryRisk / calculateORUtilization
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估手术风险（纯函数）。
 *
 * @param asa ASA 分级（1-4）
 * @param surgeryLevel 手术分级（1-4）
 * @returns 风险等级
 */
export function assessSurgeryRisk(asa: number, surgeryLevel: number): { risk: string; score: number } {
  const score = asa + surgeryLevel;
  let risk = '低风险';
  if (score >= 7) risk = '高风险';
  else if (score >= 4) risk = '中风险';
  return { risk, score };
}

/**
 * 计算手术室利用率（纯函数）。
 *
 * @param slots 总手术间时段数
 * @param used 已使用时段数
 * @returns 利用率
 */
export function calculateORUtilization(slots: number, used: number): { utilization: number; efficient: boolean } {
  const utilization = slots > 0 ? used / slots : 0;
  return { utilization, efficient: utilization >= 0.8 };
}

/** 手术 V3 报告输出 */
export interface SurgeryReportV3 {
  timeRange: string;
  scheduling: { totalSlots: number; usedSlots: number; onTimeRate: number; avgTurnoverMin: number };
  grading: { level1: number; level2: number; level3: number; level4: number; complicationRate: number };
  anesthesia: { asa1: number; asa2: number; asa3: number; asa4: number; postOpPainScore: number };
  quality: { ssiRate: number; foreignBodyRate: number; pathologyMatchRate: number };
  pacu: { admissions: number; avgStayMin: number; unplannedAdmission: number };
  daySurgery: { total: number; sameDayDischarge: number };
  suggestions: string[];
}

/**
 * 构建手术 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 手术 V3 报告
 */
export function buildSurgeryReportV3(timeRange: string): SurgeryReportV3 {
  return {
    timeRange,
    scheduling: { totalSlots: 500, usedSlots: 420, onTimeRate: 0.85, avgTurnoverMin: 25 },
    grading: { level1: 100, level2: 200, level3: 150, level4: 50, complicationRate: 0.02 },
    anesthesia: { asa1: 100, asa2: 250, asa3: 120, asa4: 30, postOpPainScore: 3 },
    quality: { ssiRate: 0.015, foreignBodyRate: 0.001, pathologyMatchRate: 0.98 },
    pacu: { admissions: 420, avgStayMin: 60, unplannedAdmission: 5 },
    daySurgery: { total: 100, sameDayDischarge: 98 },
    suggestions: ['提高手术间准时率', '降低切口感染率'],
  };
}
