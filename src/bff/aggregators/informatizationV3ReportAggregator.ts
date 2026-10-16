/**
 * 健澜科技 jlmedaios - 信息化规划 V3 纯函数（M244-A）
 *
 * buildInformatizationV3Report / assessInformatizationMaturityV3 / buildITRoadmapV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估信息化成熟度 V3（纯函数）。
 *
 * @param capabilities 能力
 * @returns 成熟度
 */
export function assessInformatizationMaturityV3(capabilities: { business: number; data: number; tech: number; integration: number }): { level: string; score: number } {
  const score = Math.round((capabilities.business + capabilities.data + capabilities.tech + capabilities.integration) / 4);
  let level = "L2";
  if (score >= 90) level = "L5";
  else if (score >= 80) level = "L4";
  else if (score >= 70) level = "L3";
  return { level, score };
}

/**
 * 制定 IT 路线图 V3（纯函数）。
 *
 * @param projects 项目
 * @param budget 预算
 * @returns 路线图
 */
export function buildITRoadmapV3(projects: number, budget: number): { projects: number; budget: number; avgCost: number } {
  return { projects, budget, avgCost: Math.round(budget / projects) };
}

/** 信息化规划 V3 报告输出 */
export interface InformatizationV3Report {
  timeRange: string;
  strategy: { years: number; budget: number; roi: number };
  architecture: { business: number; data: number; tech: number };
  systems: { his: number; emr: number; lis: number; pacs: number };
  integration: { esb: number; api: number; empi: number; fhir: number };
  suggestions: string[];
}

/**
 * 构建信息化规划 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 信息化规划 V3 报告
 */
export function buildInformatizationV3Report(timeRange: string): InformatizationV3Report {
  return {
    timeRange,
    strategy: { years: 5, budget: 10000, roi: 150 },
    architecture: { business: 85, data: 80, tech: 90 },
    systems: { his: 1, emr: 1, lis: 1, pacs: 1 },
    integration: { esb: 1, api: 500, empi: 1, fhir: 100 },
    suggestions: ["推进 FHIR 互联互通", "提升数据治理水平"],
  };
}
