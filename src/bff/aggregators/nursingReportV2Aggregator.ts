/**
 * 健澜科技 jlmedaios - 护理管理 V2 纯函数（M212-C）
 *
 * buildNursingReportV2 / calculateNursingSatisfaction / assessNursingStaffing
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算护理满意度（纯函数）。
 *
 * @param feedback 反馈分数（0-100）
 * @returns 满意度
 */
export function calculateNursingSatisfaction(feedback: number[]): { avg: number; level: string } {
  const avg = feedback.length > 0 ? feedback.reduce((a, b) => a + b, 0) / feedback.length : 0;
  let level = '良好';
  if (avg >= 95) level = '优秀';
  else if (avg < 85) level = '一般';
  return { avg, level };
}

/**
 * 评估护理人力（纯函数）。
 *
 * @param beds 床位数
 * @param nurses 护士数
 * @returns 床护比
 */
export function assessNursingStaffing(beds: number, nurses: number): { nurseBedRatio: number; adequate: boolean } {
  const nurseBedRatio = beds > 0 ? nurses / beds : 0;
  return { nurseBedRatio, adequate: nurseBedRatio >= 0.4 };
}

/** 护理 V2 报告输出 */
export interface NursingReportV2 {
  timeRange: string;
  quality: { basic: number; special: number; level1: number };
  safety: { fall: number; pressureUlcer: number; tubeDisplacement: number; medicationError: number };
  staffing: { beds: number; nurses: number; nightShift: number };
  specialty: { picc: number; icu: number; er: number; wound: number };
  research: { projects: number };
  management: { threeTier: boolean };
  suggestions: string[];
}

/**
 * 构建护理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 护理 V2 报告
 */
export function buildNursingReportV2(timeRange: string): NursingReportV2 {
  return {
    timeRange,
    quality: { basic: 0.98, special: 0.95, level1: 0.96 },
    safety: { fall: 20, pressureUlcer: 10, tubeDisplacement: 15, medicationError: 5 },
    staffing: { beds: 1000, nurses: 500, nightShift: 100 },
    specialty: { picc: 20, icu: 50, er: 30, wound: 15 },
    research: { projects: 5 },
    management: { threeTier: true },
    suggestions: ['降低跌倒发生率', '提高床护比'],
  };
}
