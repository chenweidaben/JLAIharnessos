/**
 * 健澜科技 jlmedaios - 医院质量监测 HQMS V5 纯函数（M278-D）
 *
 * collectHQMSMetricsV5 / benchmarkHQMSV5 / assessQualityV5 / buildHQMSV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** HQMS 指标 */
export interface HQMSMetric {
  metricCode: string;
  metricName: string;
  value: number;
  period: string;
  department: string;
  benchmark: number;
}

/**
 * 采集 HQMS 指标 V5（纯函数）：补全基准值。
 *
 * @param data 原始指标
 * @returns 带基准的指标列表
 */
export function collectHQMSMetricsV5(data: Omit<HQMSMetric, "benchmark">[]): HQMSMetric[] {
  const benchmarkMap: Record<string, number> = {
    "mortality-30d": 1.5,
    "infection-ipm": 3.0,
    "readmission-30d": 8.0,
    "bed-turnover": 25.0,
  };
  return data.map((d) => ({ ...d, benchmark: benchmarkMap[d.metricCode] ?? 50 }));
}

/**
 * HQMS 对标 V5（纯函数）：实际值与基准差值（越低越好指标反向）。
 *
 * @param metrics 指标列表
 * @returns 对标结果
 */
export function benchmarkHQMSV5(metrics: HQMSMetric[]): { metricCode: string; actual: number; benchmark: number; gap: number; better: boolean }[] {
  const lowerIsBetter = new Set(["mortality-30d", "infection-ipm", "readmission-30d"]);
  return metrics.map((m) => {
    const gap = Math.round((m.value - m.benchmark) * 100) / 100;
    const better = lowerIsBetter.has(m.metricCode) ? m.value <= m.benchmark : m.value >= m.benchmark;
    return { metricCode: m.metricCode, actual: m.value, benchmark: m.benchmark, gap, better };
  });
}

/**
 * 质量评级 V5（纯函数）：达标指标占比。
 *
 * @param metrics 指标列表
 * @returns 评级
 */
export function assessQualityV5(metrics: HQMSMetric[]): { passRate: number; grade: string; passCount: number } {
  const results = benchmarkHQMSV5(metrics);
  const passCount = results.filter((r) => r.better).length;
  const passRate = metrics.length > 0 ? Math.round((passCount / metrics.length) * 1000) / 10 : 0;
  let grade = "B";
  if (passRate >= 90) grade = "A";
  else if (passRate >= 70) grade = "B";
  else grade = "C";
  return { passRate, grade, passCount };
}

/** HQMS 报告输出 */
export interface HQMSV5Report {
  totalMetrics: number;
  passCount: number;
  passRate: number;
  grade: string;
  belowBenchmark: string[];
  suggestions: string[];
}

/**
 * 构建 HQMS 报告（纯函数）。
 *
 * @param metrics 指标
 * @returns 报告
 */
export function buildHQMSV5Report(metrics: HQMSMetric[]): HQMSV5Report {
  const results = benchmarkHQMSV5(metrics);
  const belowBenchmark = results.filter((r) => !r.better).map((r) => r.metricCode);
  const quality = assessQualityV5(metrics);
  return {
    totalMetrics: metrics.length,
    passCount: quality.passCount,
    passRate: quality.passRate,
    grade: quality.grade,
    belowBenchmark,
    suggestions: belowBenchmark.length > 0
      ? [`${belowBenchmark.length} 项指标未达基准，需专项改进`]
      : ["HQMS 指标全部达标，保持持续监测"],
  };
}
