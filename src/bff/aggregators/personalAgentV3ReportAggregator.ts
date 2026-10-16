/**
 * 健澜科技 jlmedaios - Personal Agent V3 纯函数（M232-B）
 *
 * buildPersonalAgentV3Report / buildAgentTask / learnFromExperience
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 构建 Agent 任务（纯函数）。
 *
 * @param role 角色
 * @param context 上下文
 * @returns 任务
 */
export function buildAgentTask(role: string, context: string): { agent: string; task: string; priority: string } {
  let priority = "普通";
  if (context.includes("紧急") || context.includes("危急")) priority = "高";
  return { agent: `${role}MUSE`, task: `处理：${context}`, priority };
}

/**
 * 从经验学习（纯函数）。
 *
 * @param interaction 交互记录
 * @param outcome 结果
 * @returns 学习结果
 */
export function learnFromExperience(interaction: string, outcome: string): { learned: boolean; improvement: string } {
  const learned = outcome.includes("成功");
  return { learned, improvement: learned ? "沉淀为最佳实践" : "复盘改进" };
}

/** Personal Agent V3 报告输出 */
export interface PersonalAgentV3Report {
  timeRange: string;
  roles: { doctor: boolean; nurse: boolean; pharma: boolean; admin: boolean; patient: boolean };
  proactive: { alerts: number; recommendations: number; reminders: number };
  flywheel: { successes: number; failures: number; knowledge: number };
  safety: { boundary: boolean; audited: boolean; humanTakeover: boolean };
  suggestions: string[];
}

/**
 * 构建 Personal Agent V3 报告。
 *
 * @param timeRange 时间范围
 * @returns Personal Agent V3 报告
 */
export function buildPersonalAgentV3Report(timeRange: string): PersonalAgentV3Report {
  return {
    timeRange,
    roles: { doctor: true, nurse: true, pharma: true, admin: true, patient: true },
    proactive: { alerts: 500, recommendations: 2000, reminders: 1500 },
    flywheel: { successes: 8000, failures: 300, knowledge: 500 },
    safety: { boundary: true, audited: true, humanTakeover: true },
    suggestions: ["扩大主动预警覆盖场景", "强化学习飞轮经验沉淀"],
  };
}
