/**
 * 健澜科技 jlmedaios - 输血反应监控纯函数（M71-A）
 * 严重度判定 / 是否阻断后续输血 / 标签。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type ReactionType = 'fever' | 'allergy' | 'hemolysis' | 'taco' | 'other';
export type ReactionSeverity = 'mild' | 'moderate' | 'severe';

export const REACTION_LABEL: Record<ReactionType, string> = {
  fever: '发热反应',
  allergy: '过敏反应',
  hemolysis: '溶血反应',
  taco: '输血相关循环超负荷',
  other: '其他',
};

/** 是否严重反应需上报：溶血（无论轻重）/ 重度（任何类型）。 */
export function isSevere(reactionType: ReactionType, severity: ReactionSeverity): boolean {
  return reactionType === 'hemolysis' || severity === 'severe';
}

/** 是否阻断后续输血：isSevere 即阻断。 */
export function blocksFutureTransfusion(reactionType: ReactionType, severity: ReactionSeverity): boolean {
  return isSevere(reactionType, severity);
}
