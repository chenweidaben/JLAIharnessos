/**
 * 健澜科技 jlmedaios - 重症医学与创伤中心纯函数（M203-A）
 *
 * buildCriticalCareReport / scoreSeverityLevel / assessTraumaSeverity
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评分重症严重程度（纯函数）。
 *
 * @param apache APACHE II 评分（0-71）
 * @param sofa SOFA 评分（0-24）
 * @returns 严重程度
 */
export function scoreSeverityLevel(apache: number, sofa: number): { level: string; deathRisk: number } {
  const deathRisk = Math.min(0.95, (apache / 71) * 0.6 + (sofa / 24) * 0.4);
  let level = '轻度';
  if (apache >= 25 || sofa >= 12) level = '重度';
  else if (apache >= 15 || sofa >= 6) level = '中度';
  return { level, deathRisk: Math.round(deathRisk * 100) / 100 };
}

/**
 * 评估创伤严重程度（纯函数）。
 *
 * @param iss ISS 评分（0-75）
 * @param gcs GCS 评分（3-15）
 * @returns 创伤分级
 */
export function assessTraumaSeverity(iss: number, gcs: number): { category: string; goldenHour: boolean } {
  let category = '轻度创伤';
  if (iss >= 25 || gcs <= 8) category = '严重创伤';
  else if (iss >= 16 || gcs <= 12) category = '中度创伤';
  const goldenHour = iss >= 16 || gcs <= 12;
  return { category, goldenHour };
}

/** ICU 报告输出 */
export interface CriticalCareReport {
  timeRange: string;
  admissions: { total: number; apacheAvg: number; sofaAvg: number; mortality: number };
  support: { ventilation: number; crrt: number; ecmo: number; iabp: number };
  sedation: { rassTarget: number };
  infection: { vapRate: number; clabsiRate: number; cautiRate: number };
  trauma: { admissions: number; goldenHour: number; multiInjury: number };
  quality: { unplannedExtubation: number; readmission: number };
  suggestions: string[];
}

/**
 * 构建重症报告。
 *
 * @param timeRange 时间范围
 * @returns 重症报告
 */
export function buildCriticalCareReport(timeRange: string): CriticalCareReport {
  return {
    timeRange,
    admissions: { total: 300, apacheAvg: 18, sofaAvg: 7, mortality: 0.15 },
    support: { ventilation: 200, crrt: 50, ecmo: 8, iabp: 15 },
    sedation: { rassTarget: -2 },
    infection: { vapRate: 0.05, clabsiRate: 0.03, cautiRate: 0.02 },
    trauma: { admissions: 100, goldenHour: 60, multiInjury: 40 },
    quality: { unplannedExtubation: 5, readmission: 8 },
    suggestions: ['降低 VAP 发生率', '缩短创伤绿色通道时间'],
  };
}
