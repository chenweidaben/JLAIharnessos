/**
 * 健澜科技 jlmedaios - 职业病防治纯函数（M221-D）
 *
 * buildOccupationalHealthReport / assessOccupationalExposure / diagnoseOccupationalDisease
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估职业暴露（纯函数）。
 *
 * @param exposure 暴露浓度
 * @param limits 限值
 * @returns 是否超标
 */
export function assessOccupationalExposure(exposure: number, limits: number): { exceeded: boolean; ratio: number } {
  const ratio = limits > 0 ? Math.round((exposure / limits) * 100) / 100 : 0;
  return { exceeded: exposure > limits, ratio };
}

/**
 * 诊断职业病（纯函数）。
 *
 * @param exposure 暴露史
 * @param symptoms 症状数
 * @returns 是否诊断
 */
export function diagnoseOccupationalDisease(exposure: boolean, symptoms: number): { diagnosed: boolean; category: string } {
  let category = '非职业病';
  if (exposure && symptoms >= 3) category = '确诊职业病';
  else if (exposure && symptoms >= 1) category = '疑似职业病';
  return { diagnosed: exposure && symptoms >= 3, category };
}

/** 职业病防治报告输出 */
export interface OccupationalHealthReport {
  timeRange: string;
  exam: { pre: number; in: number; post: number };
  diagnosis: { pneumoconiosis: number; toxicology: number; physical: number };
  hazard: { dust: number; chemical: number; biological: number };
  protection: { ppe: number };
  epidemiology: { surveys: number };
  management: { records: number };
  service: { clinics: number };
  emergency: { drills: number };
  suggestions: string[];
}

/**
 * 构建职业病防治报告。
 *
 * @param timeRange 时间范围
 * @returns 职业病防治报告
 */
export function buildOccupationalHealthReport(timeRange: string): OccupationalHealthReport {
  return {
    timeRange,
    exam: { pre: 200, in: 5000, post: 100 },
    diagnosis: { pneumoconiosis: 5, toxicology: 3, physical: 2 },
    hazard: { dust: 50, chemical: 30, biological: 10 },
    protection: { ppe: 100 },
    epidemiology: { surveys: 20 },
    management: { records: 5000 },
    service: { clinics: 5 },
    emergency: { drills: 3 },
    suggestions: ['加强上岗前体检', '完善防护用品发放'],
  };
}
