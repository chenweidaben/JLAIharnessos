/**
 * 健澜科技 jlmedaios - 应急管理 V2 纯函数（M229-A）
 *
 * buildEmergencyResponseReportV2 / triageMassCasualty / assessEmergencyReadiness
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 批量伤员检伤分类（纯函数）。
 *
 * @param patients 伤员总数
 * @returns 四色分类
 */
export function triageMassCasualty(patients: number): { red: number; yellow: number; green: number; black: number } {
  const red = Math.round(patients * 0.1);
  const yellow = Math.round(patients * 0.3);
  const green = Math.round(patients * 0.5);
  const black = patients - red - yellow - green;
  return { red, yellow, green, black };
}

/**
 * 评估应急准备度（纯函数）。
 *
 * @param plan 预案完备度
 * @param drills 演练次数
 * @param supplies 物资完备度
 * @returns 准备度等级
 */
export function assessEmergencyReadiness(plan: number, drills: number, supplies: number): { score: number; level: string } {
  const score = Math.round((plan + drills * 10 + supplies) / 3);
  let level = '一般';
  if (score >= 90) level = '优秀';
  else if (score >= 75) level = '良好';
  return { score, level };
}

/** 应急管理 V2 报告输出 */
export interface EmergencyResponseReportV2 {
  timeRange: string;
  plan: { comprehensive: number; special: number; onSite: number };
  organization: { command: boolean; teams: number; experts: number };
  massCasualty: { drill: number };
  response: { level: string; activated: number };
  supplies: { categories: number; adequacy: number };
  communication: { system: boolean };
  training: { sessions: number };
  afterAction: { reviews: number };
  suggestions: string[];
}

/**
 * 构建应急管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 应急管理 V2 报告
 */
export function buildEmergencyResponseReportV2(timeRange: string): EmergencyResponseReportV2 {
  return {
    timeRange,
    plan: { comprehensive: 1, special: 10, onSite: 20 },
    organization: { command: true, teams: 5, experts: 30 },
    massCasualty: { drill: 2 },
    response: { level: 'I级', activated: 1 },
    supplies: { categories: 50, adequacy: 95 },
    communication: { system: true },
    training: { sessions: 12 },
    afterAction: { reviews: 3 },
    suggestions: ['加强应急物资储备', '定期开展批量伤员演练'],
  };
}
