/**
 * 健澜科技 jlmedaios - 经验精准主动推送 V13 纯函数（M302-A）
 *
 * rankExperienceForContextV13 / selectTopPushV13 / suppressAlreadySeenV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 候选经验 */
export interface PushExperienceV13 {
  experienceId: string;
  title: string;
  dept: string;
  disease: string;
  freshnessScore: number;
  evidenceStrength: number;
}

/** 加权排序列表项 */
export interface RankedPushV13 {
  experienceId: string;
  title: string;
  score: number;
}

/**
 * 上下文加权排序（纯函数）：科室匹配×0.4 + 病种相关×0.3 + 新鲜度×0.2 + 证据强度×0.1，保留2位。
 *
 * @param experiences 候选
 * @param dept 目标科室
 * @param disease 目标病种
 * @returns 加权排序列表（按 score 降序）
 */
export function rankExperienceForContextV13(
  experiences: PushExperienceV13[],
  dept: string,
  disease: string,
): RankedPushV13[] {
  return experiences
    .map((e): RankedPushV13 => {
      const deptMatch = e.dept === dept ? 1 : 0;
      const diseaseMatch = e.disease === disease ? 1 : 0;
      const raw = deptMatch * 0.4 + diseaseMatch * 0.3 + e.freshnessScore * 0.2 + e.evidenceStrength * 0.1;
      return {
        experienceId: e.experienceId,
        title: e.title,
        score: Math.round(raw * 100) / 100,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * 取前 N 条（纯函数）。
 *
 * @param ranked 排序列表
 * @param topN 数量
 * @returns 前 N 条
 */
export function selectTopPushV13(ranked: RankedPushV13[], topN: number): RankedPushV13[] {
  return ranked.slice(0, topN);
}

/**
 * 去重已读（纯函数）：剔除 seenIds 中的 experienceId。
 *
 * @param candidates 候选
 * @param seenIds 已读ID集合
 * @returns 新列表
 */
export function suppressAlreadySeenV13<T extends { experienceId: string }>(
  candidates: T[],
  seenIds: string[],
): T[] {
  const seen = new Set(seenIds);
  return candidates.filter((c) => !seen.has(c.experienceId));
}
