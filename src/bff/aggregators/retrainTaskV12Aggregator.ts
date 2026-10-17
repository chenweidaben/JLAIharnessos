/**
 * 健澜科技 jlmedaios - 低采纳率规则自动复训提示 V12 纯函数（M294-B）
 *
 * buildRetrainTaskV12 / prioritizeRetrainV12 / buildRetrainSummaryV12
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 低采纳规则 */
export interface LowAdoptionRuleV12 {
  ruleId: string;
  ruleName: string;
  adoptionRate: number;
}

/** 复训任务 */
export interface RetrainTaskV12 {
  taskId: string;
  ruleId: string;
  ruleName: string;
  currentRate: number;
  suggestion: string;
  urgent: boolean;
}

/** 复训汇总 */
export interface RetrainSummaryV12 {
  totalTasks: number;
  avgRate: number;
  urgentCount: number;
}

/**
 * 生成复训任务（纯函数）：为低采纳规则生成复训提示，rate<30 标记 urgent。
 *
 * @param rules 低采纳规则
 * @returns 任务列表
 */
export function buildRetrainTaskV12(rules: LowAdoptionRuleV12[]): RetrainTaskV12[] {
  return rules.map((r): RetrainTaskV12 => {
    const urgent = r.adoptionRate < 30;
    return {
      taskId: `rt-${r.ruleId}`,
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      currentRate: r.adoptionRate,
      suggestion: r.adoptionRate < 30
        ? "立即复训：补充正样本与反例"
        : "常规复训：增加反馈样本，观察一周",
      urgent,
    };
  });
}

/**
 * 紧急度排序（纯函数）：采纳率升序，越低越紧急。
 *
 * @param tasks 任务列表
 * @returns 排序后任务
 */
export function prioritizeRetrainV12(tasks: RetrainTaskV12[]): RetrainTaskV12[] {
  return [...tasks].sort((a, b) => a.currentRate - b.currentRate);
}

/**
 * 复训汇总（纯函数）：totalTasks/avgRate/urgentCount。
 *
 * @param tasks 任务列表
 * @returns 汇总
 */
export function buildRetrainSummaryV12(tasks: RetrainTaskV12[]): RetrainSummaryV12 {
  const total = tasks.length;
  if (total === 0) return { totalTasks: 0, avgRate: 0, urgentCount: 0 };
  const sum = tasks.reduce((s, t) => s + t.currentRate, 0);
  return {
    totalTasks: total,
    avgRate: Math.round((sum / total) * 10) / 10,
    urgentCount: tasks.filter((t) => t.urgent).length,
  };
}
