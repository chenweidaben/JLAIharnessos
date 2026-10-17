/**
 * 健澜科技 jlmedaios - 经验时间衰减与新鲜度 V13 纯函数（M296-A）
 *
 * freshnessScoreV13 / buildExperienceFreshnessV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 经验 */
export interface ExperienceFreshV13 {
  experienceId: string;
  title: string;
  monthsAgo: number;
}

/** 新鲜度标注 */
export interface FreshnessAnnotatedV13 {
  experienceId: string;
  title: string;
  monthsAgo: number;
  score: number;
  bucket: "fresh" | "aging" | "stale" | "archive";
}

/** 过期阈值（月）：超过则建议复核 */
export const EXPIRE_MONTHS = 24;
/** 归档阈值（月）：超过则自动归档不再推送 */
export const ARCHIVE_MONTHS = 36;

/**
 * 衰减打分（纯函数）：
 * - monthsAgo ≤ 12 → 100
 * - 12 < monthsAgo ≤ 36 → 100 - (monthsAgo-12)*100/(36-12)
 * - monthsAgo > 36 → 0
 *
 * @param monthsAgo 距今月数
 * @returns 0-100，保留1位小数
 */
export function freshnessScoreV13(monthsAgo: number): number {
  if (monthsAgo <= 12) return 100;
  if (monthsAgo >= ARCHIVE_MONTHS) return 0;
  const raw = 100 - ((monthsAgo - 12) * 100) / (ARCHIVE_MONTHS - 12);
  return Math.max(0, Math.round(raw * 10) / 10);
}

/**
 * 批量新鲜度标注（纯函数）：
 * - ≤12月 fresh
 * - 13-24月 aging
 * - 25-36月 stale（建议复核）
 * - >36月 archive（自动归档）
 *
 * @param experiences 经验列表
 * @returns 标注列表
 */
export function buildExperienceFreshnessV13(
  experiences: ExperienceFreshV13[],
): FreshnessAnnotatedV13[] {
  return experiences.map((e): FreshnessAnnotatedV13 => {
    let bucket: FreshnessAnnotatedV13["bucket"] = "fresh";
    if (e.monthsAgo > ARCHIVE_MONTHS) bucket = "archive";
    else if (e.monthsAgo > EXPIRE_MONTHS) bucket = "stale";
    else if (e.monthsAgo > 12) bucket = "aging";
    return {
      experienceId: e.experienceId,
      title: e.title,
      monthsAgo: e.monthsAgo,
      score: freshnessScoreV13(e.monthsAgo),
      bucket,
    };
  });
}
