/**
 * 健澜科技 jlmedaios - 医院级 AI 知识资产大盘 V10 纯函数（M292-D）
 *
 * buildHospitalKnowledgeAssetV10 / computeKnowledgeGrowthV10 / identifyKnowledgeGapV10
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 失败聚类 */
export interface FailureClusterV10 {
  rootCause: string;
  count: number;
}

/** 最佳实践（复用 V10） */
export interface PracticeMiniV10 {
  condition: string;
  sourceCaseCnt: number;
}

/** 医生图谱（复用 V10） */
export interface DoctorGraphMiniV10 {
  doctorId: string;
  knowledgeDensity: number;
}

/** 医院知识资产大盘 */
export interface HospitalKnowledgeAssetV10 {
  failureTotal: number;
  practiceTotal: number;
  doctorCount: number;
  avgDensity: number;
}

/**
 * 医院知识资产大盘 V10（纯函数）：汇总失败/实践/医生/平均密度。
 *
 * @param failureClusters 失败聚类
 * @param practices 最佳实践列表
 * @param doctorGraphs 医生图谱列表
 * @returns 大盘
 */
export function buildHospitalKnowledgeAssetV10(
  failureClusters: FailureClusterV10[],
  practices: PracticeMiniV10[],
  doctorGraphs: DoctorGraphMiniV10[],
): HospitalKnowledgeAssetV10 {
  const failureTotal = failureClusters.reduce((s, c) => s + c.count, 0);
  const practiceTotal = practices.length;
  const doctorCount = doctorGraphs.length;
  const avgDensity = doctorCount > 0
    ? Math.round((doctorGraphs.reduce((s, g) => s + g.knowledgeDensity, 0) / doctorCount) * 10) / 10
    : 0;
  return {
    failureTotal,
    practiceTotal,
    doctorCount,
    avgDensity,
  };
}

/**
 * 周环比增长 V10（纯函数）：失败下降率（prev>this 即下降）/实践增长率/图谱完善率。
 *
 * @param prevWeek 上周资产
 * @param thisWeek 本周资产
 * @returns 增长率%（保留1位小数）
 */
export function computeKnowledgeGrowthV10(
  prevWeek: HospitalKnowledgeAssetV10,
  thisWeek: HospitalKnowledgeAssetV10,
): {
  failureDropRatePct: number;
  practiceGrowthRatePct: number;
  densityGrowthRatePct: number;
} {
  const drop = prevWeek.failureTotal > 0
    ? ((prevWeek.failureTotal - thisWeek.failureTotal) / prevWeek.failureTotal) * 100
    : 0;
  const practiceGrowth = prevWeek.practiceTotal > 0
    ? ((thisWeek.practiceTotal - prevWeek.practiceTotal) / prevWeek.practiceTotal) * 100
    : 0;
  const densityGrowth = prevWeek.avgDensity > 0
    ? ((thisWeek.avgDensity - prevWeek.avgDensity) / prevWeek.avgDensity) * 100
    : 0;
  return {
    failureDropRatePct: Math.round(drop * 10) / 10,
    practiceGrowthRatePct: Math.round(practiceGrowth * 10) / 10,
    densityGrowthRatePct: Math.round(densityGrowth * 10) / 10,
  };
}

/**
 * 知识缺口识别 V10（纯函数）：找出 count 最高的失败聚类，但其对应 condition 的实践数为 0/最少。
 *
 * 简化策略：返回失败总数最高的根因 + 提示该类失败是否已有足够实践。
 *
 * @param asset 医院资产
 * @param failureClusters 失败聚类
 * @param practices 实践
 * @returns 缺口
 */
export function identifyKnowledgeGapV10(
  asset: HospitalKnowledgeAssetV10,
  failureClusters: FailureClusterV10[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  practices: PracticeMiniV10[],
): { gapRootCause: string; gapCount: number; light: "red" | "yellow" | "green" } {
  if (failureClusters.length === 0) {
    return { gapRootCause: "—", gapCount: 0, light: "green" };
  }
  const top = [...failureClusters].sort((a, b) => b.count - a.count)[0];
  const ratio = asset.practiceTotal > 0 ? top.count / asset.practiceTotal : Infinity;
  let light: "red" | "yellow" | "green" = "green";
  if (ratio >= 2) light = "red";
  else if (ratio >= 1) light = "yellow";
  return {
    gapRootCause: top.rootCause,
    gapCount: top.count,
    light,
  };
}
