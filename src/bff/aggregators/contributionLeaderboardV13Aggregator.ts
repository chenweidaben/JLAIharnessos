/**
 * 健澜科技 jlmedaios - 专家经验贡献激励 V13 纯函数（M298-A）
 *
 * computeContributionScoreV13 / buildContributionLeaderboardV13 / awardBadgeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 贡献者 */
export interface ContributorV13 {
  doctorId: string;
  name: string;
  reuseCount: number;
  adoptionRate: number;
  errorReduction: number;
}

/** 榜单条目 */
export interface LeaderboardEntryV13 {
  doctorId: string;
  name: string;
  score: number;
  badge: string;
}

/**
 * 贡献分计算（纯函数）：reuseCount×2 + adoptionRate×0.3 + errorReduction×5，0-100 clamp。
 *
 * @param reuseCount 复用次数
 * @param adoptionRate 采纳率%
 * @param errorReduction 错误下降百分点
 * @returns 0-100 整数
 */
export function computeContributionScoreV13(
  reuseCount: number,
  adoptionRate: number,
  errorReduction: number,
): number {
  const raw = reuseCount * 2 + adoptionRate * 0.3 + errorReduction * 5;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * 徽章分级（纯函数）：≥80 传家宝 / ≥50 良师 / ≥30 分享者 / <30 新人。
 *
 * @param score 贡献分
 * @returns 徽章
 */
export function awardBadgeV13(score: number): "传家宝" | "良师" | "分享者" | "新人" {
  if (score >= 80) return "传家宝";
  if (score >= 50) return "良师";
  if (score >= 30) return "分享者";
  return "新人";
}

/**
 * 贡献榜（纯函数）：按 score 降序排。
 *
 * @param contributors 贡献者列表
 * @returns 榜单
 */
export function buildContributionLeaderboardV13(
  contributors: ContributorV13[],
): LeaderboardEntryV13[] {
  return contributors
    .map((c): LeaderboardEntryV13 => {
      const score = computeContributionScoreV13(c.reuseCount, c.adoptionRate, c.errorReduction);
      return {
        doctorId: c.doctorId,
        name: c.name,
        score,
        badge: awardBadgeV13(score),
      };
    })
    .sort((a, b) => b.score - a.score);
}
