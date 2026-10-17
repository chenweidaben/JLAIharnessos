/**
 * 健澜科技 jlmedaios - 交接后继任者学习计划 V13 纯函数（M297-B）
 *
 * buildLearningPlanV13 / estimateStudyTimeV13 / markStudiedV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学习计划条目 */
export interface HandoverExpV13 {
  experienceId: string;
  title: string;
  bucket: "fresh" | "aging" | "stale" | "archive";
  transferability: number;
  studied: boolean;
}

/** 学习计划 */
export interface LearningPlanV13 {
  handoverId: string;
  items: HandoverExpV13[];
  totalMinutes: number;
  studiedCount: number;
}

const BUCKET_RANK: Record<HandoverExpV13["bucket"], number> = {
  fresh: 0,
  aging: 1,
  stale: 2,
  archive: 3,
};

/**
 * 预估学习时长（纯函数）：每条 15 分钟。
 *
 * @param experiences 经验列表
 * @returns 总分钟数
 */
export function estimateStudyTimeV13(experiences: HandoverExpV13[]): number {
  return experiences.length * 15;
}

/**
 * 生成学习计划（纯函数）：按 bucket 新鲜度升序 + transferability 降序排序。
 *
 * @param handoverId 交接包ID
 * @param experiences 经验列表
 * @returns 学习计划
 */
export function buildLearningPlanV13(
  handoverId: string,
  experiences: HandoverExpV13[],
): LearningPlanV13 {
  const sorted = [...experiences].sort((a, b) => {
    const bucketDiff = BUCKET_RANK[a.bucket] - BUCKET_RANK[b.bucket];
    if (bucketDiff !== 0) return bucketDiff;
    return b.transferability - a.transferability;
  });
  return {
    handoverId,
    items: sorted,
    totalMinutes: estimateStudyTimeV13(sorted),
    studiedCount: sorted.filter((e) => e.studied).length,
  };
}

/**
 * 标记已学（纯函数）：把对应 experienceId 设为 studied=true，重新计算进度。
 *
 * @param plan 学习计划
 * @param experienceId 经验ID
 * @returns 更新后计划
 */
export function markStudiedV13(
  plan: LearningPlanV13,
  experienceId: string,
): LearningPlanV13 {
  const items = plan.items.map((e) =>
    e.experienceId === experienceId ? { ...e, studied: true } : e,
  );
  return {
    ...plan,
    items,
    studiedCount: items.filter((e) => e.studied).length,
  };
}
