/**
 * 健澜科技 jlmedaios - 错误经验拦截与回滚 V13 纯函数（M299-B）
 *
 * rollbackExperienceV13 / flagSuggestionsV13 / buildRollbackReportV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 建议 */
export interface AiSuggestionV13 {
  suggestionId: string;
  linkedExperienceId: string;
  content: string;
  status: "active" | "needHumanReview";
}

/** 回滚结果 */
export interface RollbackV13 {
  experienceId: string;
  status: "rolledback";
  reason: string;
}

/** 回滚报告 */
export interface RollbackReportV13 {
  experienceId: string;
  reason: string;
  flaggedCount: number;
  summary: string;
}

/**
 * 回滚（纯函数）：status="rolledback"，记录原因。
 *
 * @param experienceId 经验ID
 * @param reason 原因
 * @returns 回滚结果
 */
export function rollbackExperienceV13(
  experienceId: string,
  reason: string,
): RollbackV13 {
  return { experienceId, status: "rolledback", reason };
}

/**
 * 受影响建议打标（纯函数）：linkedExperienceId 匹配的 → status="needHumanReview"。
 *
 * @param suggestions AI 建议列表
 * @param experienceId 被回滚的经验ID
 * @returns 新列表（匹配项已打标）
 */
export function flagSuggestionsV13(
  suggestions: AiSuggestionV13[],
  experienceId: string,
): AiSuggestionV13[] {
  return suggestions.map((s): AiSuggestionV13 => {
    if (s.linkedExperienceId === experienceId) {
      return { ...s, status: "needHumanReview" };
    }
    return s;
  });
}

/**
 * 回滚报告（纯函数）。
 *
 * @param rollback 回滚结果
 * @param flaggedCount 已拦截建议数
 * @returns 报告
 */
export function buildRollbackReportV13(
  rollback: RollbackV13,
  flaggedCount: number,
): RollbackReportV13 {
  return {
    experienceId: rollback.experienceId,
    reason: rollback.reason,
    flaggedCount,
    summary: `经验 ${rollback.experienceId} 已回滚，原因：${rollback.reason}，拦截 ${flaggedCount} 条建议`,
  };
}
