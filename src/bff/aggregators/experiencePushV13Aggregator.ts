/**
 * 健澜科技 jlmedaios - 经验推送频控与免打扰 V13 纯函数（M295-B）
 *
 * throttlePushV13 / buildDigestPushV13 / shouldNotifyV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 推送经验 */
export interface ExperiencePushV13 {
  experienceId: string;
  title: string;
  category: string;
  score: number;
}

/** 用户免打扰偏好 */
export interface UserPrefsV13 {
  mutedCategories: string[];
}

/** 频控结果 */
export interface ThrottleResultV13 {
  targetRole: string;
  top: ExperiencePushV13[];
  folded: ExperiencePushV13[];
  digestText: string;
}

/**
 * 频控（纯函数）：按 score 降序保留前 maxPerDay 条，其余折叠。
 *
 * @param experiences 候选经验
 * @param targetRole 目标角色
 * @param maxPerDay 每日上限（默认5）
 * @returns 频控结果
 */
export function throttlePushV13(
  experiences: ExperiencePushV13[],
  targetRole: string,
  maxPerDay = 5,
): ThrottleResultV13 {
  const sorted = [...experiences].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, maxPerDay);
  const folded = sorted.slice(maxPerDay);
  return {
    targetRole,
    top,
    folded,
    digestText: buildDigestPushV13(folded),
  };
}

/**
 * 折叠摘要（纯函数）：返回"还有 N 条相关经验"文本；空串表示无折叠。
 *
 * @param folded 折叠列表
 * @returns 摘要
 */
export function buildDigestPushV13(folded: ExperiencePushV13[]): string {
  if (folded.length === 0) return "";
  return `还有 ${folded.length} 条相关经验未推送`;
}

/**
 * 免打扰判断（纯函数）：用户偏好 mutedCategories 包含该 category 则不通知。
 *
 * @param experience 经验
 * @param prefs 用户偏好
 * @returns 是否应通知
 */
export function shouldNotifyV13(experience: ExperiencePushV13, prefs: UserPrefsV13): boolean {
  return !prefs.mutedCategories.includes(experience.category);
}
