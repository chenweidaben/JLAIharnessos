/**
 * 健澜科技 jlmedaios - 质控标杆管理 V14 聚合器（M504-C）
 *
 * 纯函数：标杆数据构建 + 标杆对比 + 标杆报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 标杆数据 */
export interface BenchmarkingV14 {
  dept: string;
  score: number;
  benchmark: number;
}

/** 标杆对比结果 */
export interface BenchmarkCompareV14 {
  gap: number;
  achieved: boolean;
}

/** 标杆报告 */
export interface BenchmarkReportV14 {
  dept: string;
  score: number;
  benchmark: number;
  gap: number;
  achieved: boolean;
}

/**
 * 构建标杆数据。
 *
 * @param dept 科室
 * @param score 科室评分
 * @param benchmark 标杆值
 * @returns 标杆数据
 */
export function buildBenchmark(dept: string, score: number, benchmark: number): BenchmarkingV14 {
  return { dept, score, benchmark };
}

/**
 * 对比标杆。
 *
 * @param deptScore 科室评分
 * @param benchmark 标杆值
 * @returns 对比结果（gap + achieved）
 */
export function compareBenchmark(deptScore: number, benchmark: number): BenchmarkCompareV14 {
  // 手算对比：gap=deptScore-benchmark，>=0 达标，<0 未达标
  const gap = deptScore - benchmark;
  const achieved = gap >= 0;
  return { gap, achieved };
}

/**
 * 构建标杆报告。
 *
 * @param b 标杆数据
 * @param c 对比结果
 * @returns 标杆报告（dept + score + benchmark + gap + achieved）
 */
export function buildBenchmarkReport(b: BenchmarkingV14, c: BenchmarkCompareV14): BenchmarkReportV14 {
  return {
    dept: b.dept,
    score: b.score,
    benchmark: b.benchmark,
    gap: c.gap,
    achieved: c.achieved,
  };
}
