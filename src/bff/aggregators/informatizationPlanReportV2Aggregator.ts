/**
 * 健澜科技 jlmedaios - 信息化规划 V2 纯函数（M227-A）
 *
 * buildInformatizationPlanReportV2 / assessInformatizationMaturity / buildITRoadmap
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估信息化成熟度（纯函数）。
 *
 * @param capabilities 能力项达标数
 * @returns 成熟度等级
 */
export function assessInformatizationMaturity(capabilities: number): { level: string; score: number } {
  let level = '一级';
  if (capabilities >= 8) level = '五级';
  else if (capabilities >= 6) level = '四级';
  else if (capabilities >= 4) level = '三级';
  else if (capabilities >= 2) level = '二级';
  return { level, score: capabilities * 10 };
}

/**
 * 构建 IT 路线图（纯函数）。
 *
 * @param projects 项目数
 * @param budget 总预算
 * @returns 路线图
 */
export function buildITRoadmap(projects: number, budget: number): { projects: number; avgBudget: number; years: number } {
  const avgBudget = projects > 0 ? Math.round(budget / projects) : 0;
  return { projects, avgBudget, years: 3 };
}

/** 信息化规划 V2 报告输出 */
export interface InformatizationPlanReportV2 {
  timeRange: string;
  strategy: { horizon: number; roi: number };
  architecture: { business: number; application: number; data: number; integration: number };
  systems: { his: boolean; emr: boolean; lis: boolean; pacs: boolean };
  integration: { esb: boolean; fhir: boolean; empi: boolean };
  security: { mlps3: boolean };
  projects: { planned: number; inProgress: number };
  governance: { itDept: number };
  smart: { level: number };
  suggestions: string[];
}

/**
 * 构建信息化规划 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 信息化规划 V2 报告
 */
export function buildInformatizationPlanReportV2(timeRange: string): InformatizationPlanReportV2 {
  return {
    timeRange,
    strategy: { horizon: 5, roi: 25 },
    architecture: { business: 1, application: 20, data: 5, integration: 3 },
    systems: { his: true, emr: true, lis: true, pacs: true },
    integration: { esb: true, fhir: true, empi: true },
    security: { mlps3: true },
    projects: { planned: 15, inProgress: 8 },
    governance: { itDept: 30 },
    smart: { level: 4 },
    suggestions: ['推进 FHIR 互操作', '加强 IT 治理'],
  };
}
