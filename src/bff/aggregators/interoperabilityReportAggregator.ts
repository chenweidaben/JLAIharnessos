/**
 * 健澜科技 jlmedaios - 互联互通标准化成熟度纯函数（M210-B）
 *
 * buildInteroperabilityReport / assessInteropMaturity / validateDatasetCompliance
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估互联互通成熟度（纯函数）。
 *
 * @param level 当前等级（1-5）
 * @returns 成熟度等级与准备状态
 */
export function assessInteropMaturity(level: number): { maturity: string; readyForNext: boolean } {
  if (level >= 5) return { maturity: '五级甲', readyForNext: false };
  if (level >= 4) return { maturity: '四级甲', readyForNext: true };
  if (level >= 3) return { maturity: '三级', readyForNext: true };
  return { maturity: '未达标', readyForNext: false };
}

/** 数据集合规数据 */
export interface DatasetCompliance {
  ws363: number;
  ws445: number;
}

/**
 * 校验数据集合规（纯函数）。
 *
 * @param data 合规率
 * @returns 是否合规
 */
export function validateDatasetCompliance(data: DatasetCompliance): { compliant: boolean; ws363Rate: number; ws445Rate: number } {
  return {
    compliant: data.ws363 >= 0.9 && data.ws445 >= 0.9,
    ws363Rate: data.ws363,
    ws445Rate: data.ws445,
  };
}

/** 互联互通报告输出 */
export interface InteroperabilityReport {
  timeRange: string;
  architecture: { integratedPlatform: boolean; esb: boolean; masterData: boolean };
  dataset: DatasetCompliance;
  integration: { his: boolean; emr: boolean; lis: boolean; pacs: boolean; ris: boolean };
  regional: { connected: boolean };
  rating: { current: number; target: number };
  suggestions: string[];
}

/**
 * 构建互联互通报告。
 *
 * @param timeRange 时间范围
 * @returns 互联互通报告
 */
export function buildInteroperabilityReport(timeRange: string): InteroperabilityReport {
  return {
    timeRange,
    architecture: { integratedPlatform: true, esb: true, masterData: true },
    dataset: { ws363: 0.95, ws445: 0.92 },
    integration: { his: true, emr: true, lis: true, pacs: true, ris: true },
    regional: { connected: true },
    rating: { current: 4, target: 5 },
    suggestions: ['准备四级甲等测评', '提高 WS445 合规率'],
  };
}
