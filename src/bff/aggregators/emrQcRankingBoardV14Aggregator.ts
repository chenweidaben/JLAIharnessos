/**
 * 健澜科技 jlmedaios - 病历科室质控排行榜 V14 聚合器（M470-B，-board 后缀避让）
 *
 * 纯函数：按 score 降序排名 + 对比 prevRank 算升降趋势 + 生成排行榜表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室得分输入 */
export interface DeptScoreInputV14 {
  name: string;
  score: number;
  prevRank?: number;
}

/** 排名结果 */
export interface DeptRankedV14 {
  name: string;
  score: number;
  rank: number;
  trend: "up" | "down" | "same";
}

/** 排行榜表 */
export interface RankingBoardV14 {
  headers: string[];
  rows: { name: string; score: number; rank: number; trend: string }[];
}

/**
 * 按 score 降序排名，对比 prevRank 算升降趋势。
 * rank < prevRank → 'up'（名次上升）
 * rank > prevRank → 'down'（名次下降）
 * 相等或无 prevRank → 'same'
 *
 * @param depts 科室得分列表
 * @returns 排名结果（降序）
 */
export function rankDeptsByScore(depts: DeptScoreInputV14[]): DeptRankedV14[] {
  return [...depts]
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => {
      const rank = idx + 1;
      let trend: "up" | "down" | "same" = "same";
      if (item.prevRank !== undefined) {
        if (rank < item.prevRank) trend = "up";
        else if (rank > item.prevRank) trend = "down";
      }
      return { name: item.name, score: item.score, rank, trend };
    });
}

/**
 * 生成排行榜表。
 *
 * @param ranked 排名结果
 * @returns 排行榜表
 */
export function buildRankingBoard(ranked: DeptRankedV14[]): RankingBoardV14 {
  return {
    headers: ["名次", "科室名", "得分", "趋势"],
    rows: ranked.map((r) => ({
      name: r.name,
      score: r.score,
      rank: r.rank,
      trend: r.trend,
    })),
  };
}
