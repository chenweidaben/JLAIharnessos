/**
 * 健澜科技 jlmedaios - 贡献荣誉墙与月度之星 V13 纯函数（M298-B）
 *
 * buildHonorWallV13 / selectMonthlyStarV13 / computeContributionTrendV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 榜单条目（与 M298-A 同结构） */
export interface HonorEntryV13 {
  doctorId: string;
  name: string;
  score: number;
  badge: string;
}

/** 荣誉墙 */
export interface HonorWallV13 {
  top3: HonorEntryV13[];
  rest: HonorEntryV13[];
}

/**
 * 荣誉墙（纯函数）：前3名特别展示，其余进 rest。
 *
 * @param leaderboard 榜单（已按 score 降序）
 * @returns 荣誉墙
 */
export function buildHonorWallV13(leaderboard: HonorEntryV13[]): HonorWallV13 {
  return {
    top3: leaderboard.slice(0, 3),
    rest: leaderboard.slice(3),
  };
}

/**
 * 月度之星（纯函数）：本月最高分，且不在 prevWinners 中（避免连续两月当选）。
 *
 * @param leaderboard 本月榜单
 * @param prevWinners 上月及更早获奖名单
 * @returns 月度之星（无则 null）
 */
export function selectMonthlyStarV13(
  leaderboard: HonorEntryV13[],
  prevWinners: string[],
): HonorEntryV13 | null {
  for (const entry of leaderboard) {
    if (!prevWinners.includes(entry.doctorId)) return entry;
  }
  return null;
}

/**
 * 环比增长（纯函数）：this - last，保留1位小数。
 *
 * @param thisMonth 本月均分
 * @param lastMonth 上月均分
 * @returns delta
 */
export function computeContributionTrendV13(thisMonth: number, lastMonth: number): number {
  return Math.round((thisMonth - lastMonth) * 10) / 10;
}
