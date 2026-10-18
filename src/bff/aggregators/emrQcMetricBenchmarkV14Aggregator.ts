/**
 * 健澜科技 jlmedaios - 质控指标对标 V14 聚合器（M484-B）
 *
 * 纯函数：对标数据构建 + 差距对比。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 对标数据 */
export interface BenchmarkV14 {
  metricName: string;
  ourValue: number;
  benchmarkValue: number;
}

/** 差距对比结果 */
export interface BenchmarkGapV14 {
  gap: number;
  status: "above" | "below" | "equal";
}

/**
 * 构建对标数据。
 *
 * @param metricName 指标名
 * @param ourValue 本院值
 * @param benchmarkValue 标杆值
 * @returns 对标数据
 */
export function buildBenchmark(metricName: string, ourValue: number, benchmarkValue: number): BenchmarkV14 {
  return { metricName, ourValue, benchmarkValue };
}

/**
 * 对比差距：gap = ourValue - benchmarkValue。
 * above：本院值高于标杆值；below：低于；equal：相等。
 *
 * @param ourValue 本院值
 * @param benchmarkValue 标杆值
 * @returns 差距对比结果
 */
export function compareToBenchmark(ourValue: number, benchmarkValue: number): BenchmarkGapV14 {
  const gap = ourValue - benchmarkValue;
  if (gap > 0) {
    return { gap, status: "above" };
  }
  if (gap < 0) {
    return { gap, status: "below" };
  }
  return { gap: 0, status: "equal" };
}
