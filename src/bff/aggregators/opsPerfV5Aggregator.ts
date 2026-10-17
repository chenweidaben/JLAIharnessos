/**
 * 健澜科技 jlmedaios - 性能与容量压测 V5 纯函数（M286-C）
 *
 * designLoadV5 / analyzePerfV5 / estimateCapacityV5 / buildOpsPerfV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 压测结果 */
export interface PerfRun {
  scenario: string;
  vusers: number;
  durationSec: number;
  p95Ms: number;
  p99Ms: number;
  throughput: number;
  errorRate: number;
}

/**
 * 负载模型 V5（纯函数）：按基线与峰值生成阶梯。
 *
 * @param baseline 基线并发
 * @param peak 峰值并发
 * @returns 阶梯 VU 序列
 */
export function designLoadV5(baseline: number, peak: number): { stages: number[]; rampUpSec: number } {
  const stages: number[] = [];
  const step = Math.max(1, Math.round((peak - baseline) / 3));
  let v = baseline;
  while (v < peak) {
    stages.push(v);
    v = Math.min(v + step, peak);
  }
  stages.push(peak);
  return { stages, rampUpSec: stages.length * 30 };
}

/**
 * 性能分析 V5（纯函数）：识别瓶颈场景（P95>2000ms 或 错误率>1%）。
 *
 * @param runs 压测结果列表
 * @returns 分析
 */
export function analyzePerfV5(runs: PerfRun[]): {
  bottlenecks: string[];
  avgP95Ms: number;
  avgErrorRate: number;
} {
  const bottlenecks: string[] = [];
  for (const r of runs) {
    if (r.p95Ms > 2000 || r.errorRate > 1) {
      bottlenecks.push(r.scenario);
    }
  }
  const avgP95Ms = runs.length > 0
    ? Math.round((runs.reduce((s, r) => s + r.p95Ms, 0) / runs.length) * 10) / 10
    : 0;
  const avgErrorRate = runs.length > 0
    ? Math.round((runs.reduce((s, r) => s + r.errorRate, 0) / runs.length) * 100) / 100
    : 0;
  return { bottlenecks, avgP95Ms, avgErrorRate };
}

/**
 * 容量估算 V5（纯函数）：按吞吐与预留水位推荐实例数。
 *
 * @param throughput 实测吞吐 req/s
 * @param headroom 预留水位（0-1）
 * @returns 容量建议
 */
export function estimateCapacityV5(throughput: number, headroom: number): {
  safeThroughput: number;
  requiredInstances: number;
} {
  const safeThroughput = Math.round(throughput * (1 - headroom) * 10) / 10;
  const perInstance = 500;
  const requiredInstances = Math.max(1, Math.ceil(safeThroughput / perInstance));
  return { safeThroughput, requiredInstances };
}

/** 压测看板输出 */
export interface OpsPerfV5Report {
  totalRuns: number;
  bottleneckCount: number;
  recommendedInstances: number;
}

/**
 * 构建压测看板（纯函数）。
 *
 * @param runs 压测结果列表
 * @param headroom 预留水位
 * @returns 看板
 */
export function buildOpsPerfV5Report(runs: PerfRun[], headroom: number): OpsPerfV5Report {
  const analysis = analyzePerfV5(runs);
  const totalThroughput = runs.reduce((s, r) => s + r.throughput, 0);
  const capacity = estimateCapacityV5(totalThroughput, headroom);
  return {
    totalRuns: runs.length,
    bottleneckCount: analysis.bottlenecks.length,
    recommendedInstances: capacity.requiredInstances,
  };
}
