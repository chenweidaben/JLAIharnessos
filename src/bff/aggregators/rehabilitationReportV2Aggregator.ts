/**
 * 健澜科技 jlmedaios - 康复医学 V2 纯函数（M222-A）
 *
 * buildRehabilitationReportV2 / assessADLIndependence / designRehabPlan
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估 ADL 独立性（纯函数）。
 *
 * @param barthel Barthel 指数（0-100）
 * @returns 独立等级
 */
export function assessADLIndependence(barthel: number): { level: string; independent: boolean } {
  let level = '依赖';
  if (barthel >= 95) level = '完全独立';
  else if (barthel >= 60) level = '轻度依赖';
  else if (barthel >= 40) level = '中度依赖';
  return { level, independent: barthel >= 95 };
}

/**
 * 设计康复计划（纯函数）。
 *
 * @param patient 患者数
 * @param diagnosis 诊断
 * @returns 计划
 */
export function designRehabPlan(patient: number, diagnosis: string): { modalities: string[]; duration: number } {
  const modalities = ['PT', 'OT', 'ST'];
  let duration = 4;
  if (diagnosis.includes('卒中')) duration = 8;
  else if (diagnosis.includes('脊髓损伤')) duration = 12;
  return { modalities, duration };
}

/** 康复医学 V2 报告输出 */
export interface RehabilitationReportV2 {
  timeRange: string;
  assessment: { adl: number; cognitive: number; speech: number; swallow: number };
  therapy: { pt: number; ot: number; st: number };
  engineering: { prosthesis: number; orthosis: number; home: number };
  specialty: { stroke: number; tbi: number; sci: number; fracture: number; cardiac: number };
  nursing: { beds: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建康复医学 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 康复医学 V2 报告
 */
export function buildRehabilitationReportV2(timeRange: string): RehabilitationReportV2 {
  return {
    timeRange,
    assessment: { adl: 300, cognitive: 100, speech: 80, swallow: 50 },
    therapy: { pt: 1000, ot: 800, st: 200 },
    engineering: { prosthesis: 30, orthosis: 100, home: 20 },
    specialty: { stroke: 200, tbi: 30, sci: 20, fracture: 150, cardiac: 80 },
    nursing: { beds: 60 },
    management: { satisfaction: 92 },
    suggestions: ['扩大卒中康复覆盖', '加强居家康复指导'],
  };
}
