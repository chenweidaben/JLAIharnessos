/**
 * 健澜科技 jlmedaios - 病历质控指标对标分析 V14 聚合器（M471-C）
 *
 * 纯函数：与标杆值对比 + 生成改进建议。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 对标结果 */
export interface BenchmarkResultV14 {
  current: number;
  benchmark: number;
  gap: number;
  direction: "above" | "below" | "equal";
}

/** 差距分析建议 */
export interface GapAnalysisV14 {
  suggestion: string;
}

/**
 * 与标杆值对比：gap=current-benchmark，>0 above，<0 below，=0 equal。
 *
 * @param current 本院当前值
 * @param benchmark 标杆值
 * @returns 对标结果
 */
export function compareToBenchmark(
  current: number,
  benchmark: number,
): BenchmarkResultV14 {
  const gap = Math.round((current - benchmark) * 10) / 10;
  let direction: "above" | "below" | "equal" = "equal";
  if (gap > 0) direction = "above";
  else if (gap < 0) direction = "below";
  return { current, benchmark, gap, direction };
}

/**
 * 生成改进建议：gap>0→"优于标杆，保持优势"；gap<0→"低于标杆，需改进"；gap=0→"与标杆持平"。
 *
 * @param result 对标结果
 * @returns 改进建议
 */
export function buildGapAnalysis(result: Pick<BenchmarkResultV14, "gap">): GapAnalysisV14 {
  if (result.gap > 0) {
    return { suggestion: "优于标杆，保持优势" };
  }
  if (result.gap < 0) {
    return { suggestion: "低于标杆，需改进" };
  }
  return { suggestion: "与标杆持平" };
}
