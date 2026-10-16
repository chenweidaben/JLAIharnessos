/**
 * 健澜科技 jlmedaios - 智慧服务评级纯函数（M218-D）
 *
 * buildSmartServiceRatingReport / assessSmartServiceLevel / buildSmartServiceGap
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估智慧服务等级（纯函数）。
 *
 * @param capabilities 能力数
 * @returns 等级
 */
export function assessSmartServiceLevel(capabilities: number): { level: number; name: string } {
  let level = 1;
  let name = "基础服务";
  if (capabilities >= 20) { level = 5; name = "全程陪伴"; }
  else if (capabilities >= 15) { level = 4; name = "AI驱动"; }
  else if (capabilities >= 10) { level = 3; name = "多端一致"; }
  else if (capabilities >= 5) { level = 2; name = "线上线下融合"; }
  return { level, name };
}

/**
 * 构建智慧服务差距分析（纯函数）。
 *
 * @param current 当前等级
 * @param target 目标等级
 * @returns 差距
 */
export function buildSmartServiceGap(current: number, target: number): { gap: number; actions: string[] } {
  const gap = Math.max(0, target - current);
  const actions: string[] = [];
  if (gap > 0) actions.push(`补齐第 ${target} 级所需能力`);
  if (gap > 1) actions.push("加强 AI 预测服务能力");
  return { gap, actions };
}

/** 智慧服务评级报告输出 */
export interface SmartServiceRatingReport {
  timeRange: string;
  currentLevel: { level: number; name: string };
  targetLevel: number;
  capabilities: { total: number };
  omnichannel: { online: number; offline: number };
  ai: { predictive: boolean };
  patientExperience: { score: number };
  readiness: { selfAssessment: boolean };
  suggestions: string[];
}

/**
 * 构建智慧服务评级报告。
 *
 * @param timeRange 时间范围
 * @returns 智慧服务评级报告
 */
export function buildSmartServiceRatingReport(timeRange: string): SmartServiceRatingReport {
  return {
    timeRange,
    currentLevel: { level: 3, name: "多端一致" },
    targetLevel: 5,
    capabilities: { total: 12 },
    omnichannel: { online: 80, offline: 60 },
    ai: { predictive: false },
    patientExperience: { score: 88 },
    readiness: { selfAssessment: true },
    suggestions: ["补齐AI预测服务能力", "加强线上线下融合"],
  };
}
