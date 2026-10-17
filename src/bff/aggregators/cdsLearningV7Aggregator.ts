/**
 * 健澜科技 jlmedaios - 用药知识沉淀与反馈学习 V7 纯函数（M289-C）
 *
 * tallyOverrideV7 / computeAdherenceV7 / deriveRuleSuggestionV7
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生反馈 */
export interface DrugFeedback {
  drugCode: string;
  ruleId: string;
  doctorAction: string;
  feedbackType: "accept" | "override" | "ignore";
}

/** 规则强度 */
export interface RuleStrength {
  ruleId: string;
  hitCnt: number;
  overrideCnt: number;
}

/**
 * override 统计 V7（纯函数）：feedback_type="override" 的数量。
 *
 * @param feedbacks 反馈列表
 * @returns override 数
 */
export function tallyOverrideV7(feedbacks: DrugFeedback[]): number {
  return feedbacks.filter((f) => f.feedbackType === "override").length;
}

/**
 * 规则遵守率 V7（纯函数）：1 − override/hit，转百分比（0-100）。
 *
 * @param ruleId 规则ID
 * @param feedbacks 反馈列表
 * @returns 遵守率%（保留1位小数）
 */
export function computeAdherenceV7(ruleId: string, feedbacks: DrugFeedback[]): number {
  const hitCnt = feedbacks.filter((f) => f.ruleId === ruleId).length;
  const overrideCnt = feedbacks.filter((f) => f.ruleId === ruleId && f.feedbackType === "override").length;
  if (hitCnt === 0) return 100;
  const rate = (1 - overrideCnt / hitCnt) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * 弱规则建议 V7（纯函数）：adherence<50 → 复核/下架；50-80 → 优化阈值；≥80 → 保持。
 *
 * @param strength 规则强度
 * @returns 建议
 */
export function deriveRuleSuggestionV7(strength: { hitCnt: number; overrideCnt: number; adherenceRatePct: number }): {
  suggestion: "建议复核或下架" | "建议优化阈值" | "保持";
  light: "red" | "yellow" | "green";
} {
  const rate = strength.adherenceRatePct;
  if (rate < 50) return { suggestion: "建议复核或下架", light: "red" };
  if (rate < 80) return { suggestion: "建议优化阈值", light: "yellow" };
  return { suggestion: "保持", light: "green" };
}
