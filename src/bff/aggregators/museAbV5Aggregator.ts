/**
 * 健澜科技 jlmedaios - MUSE A/B 测试与效果评估 V5 纯函数（M285-C）
 *
 * designABTestV5 / analyzeABV5 / decideWinnerV5 / buildMuseABV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 实验设计 */
export interface ABTestDesign {
  hypothesis: string;
  variantA: string;
  variantB: string;
  sampleSize: number;
  metric: string;
}

/** 实验结果 */
export interface ABResult {
  variantA: { rate: number; sample: number };
  variantB: { rate: number; sample: number };
}

/**
 * 实验设计 V5（纯函数）：最小样本量按 10% 提升反推。
 *
 * @param hypothesis 假设
 * @param metric 指标
 * @returns 实验设计
 */
export function designABTestV5(hypothesis: string, metric: string): ABTestDesign {
  return {
    hypothesis,
    variantA: "对照组",
    variantB: "实验组",
    sampleSize: 400,
    metric,
  };
}

/**
 * 显著性分析 V5（纯函数）：差异率差与统计显著性。
 *
 * @param result AB结果
 * @returns 分析
 */
export function analyzeABV5(result: ABResult): {
  diffPct: number;
  significant: boolean;
} {
  const diffPct = Math.round((result.variantB.rate - result.variantA.rate) * 1000) / 10;
  // 简易显著性：差异绝对值 > 5% 且样本 >= 100
  const minSample = Math.min(result.variantA.sample, result.variantB.sample);
  const significant = Math.abs(diffPct) > 5 && minSample >= 100;
  return { diffPct, significant };
}

/**
 * 决策 V5（纯函数）：显著性且B更好→B胜，显著性且A更好→A胜，否则平局。
 *
 * @param result AB结果
 * @returns 决策
 */
export function decideWinnerV5(result: ABResult): {
  winner: "A" | "B" | "tie";
  reason: string;
} {
  const analysis = analyzeABV5(result);
  if (!analysis.significant) return { winner: "tie", reason: "差异不显著" };
  if (result.variantB.rate > result.variantA.rate) {
    return { winner: "B", reason: `B提升${analysis.diffPct}%且显著` };
  }
  if (result.variantA.rate > result.variantB.rate) {
    return { winner: "A", reason: `A优于B ${-analysis.diffPct}%` };
  }
  return { winner: "tie", reason: "完全相等" };
}

/** AB 看板输出 */
export interface MuseABV5Report {
  totalTests: number;
  bWins: number;
  tieRate: number;
}

/**
 * 构建 AB 看板（纯函数）。
 *
 * @param results 结果列表
 * @returns 看板
 */
export function buildMuseABV5Report(results: ABResult[]): MuseABV5Report {
  let bWins = 0;
  let ties = 0;
  for (const r of results) {
    const d = decideWinnerV5(r);
    if (d.winner === "B") bWins += 1;
    if (d.winner === "tie") ties += 1;
  }
  return {
    totalTests: results.length,
    bWins,
    tieRate: results.length > 0 ? Math.round((ties / results.length) * 1000) / 10 : 0,
  };
}
