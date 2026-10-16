/**
 * 健澜科技 jlmedaios - 流程优化纯函数（M218-C）
 *
 * buildProcessOptimizationReport / optimizePatientFlow / calculateWaitTime
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 优化患者流（纯函数）。
 *
 * @param journey 旅程步骤数
 * @returns 优化后步骤数
 */
export function optimizePatientFlow(journey: number): { original: number; optimized: number; reduction: number } {
  const optimized = Math.max(1, Math.round(journey * 0.7));
  return { original: journey, optimized, reduction: journey - optimized };
}

/**
 * 计算等待时间（纯函数）。
 *
 * @param queue 排队人数
 * @param throughput 每小时 throughput
 * @returns 等待时间（分钟）
 */
export function calculateWaitTime(queue: number, throughput: number): { waitMinutes: number } {
  const waitMinutes = throughput > 0 ? (queue / throughput) * 60 : 0;
  return { waitMinutes: Math.round(waitMinutes) };
}

/** 流程优化报告输出 */
export interface ProcessOptimizationReport {
  timeRange: string;
  outpatient: { waitTime: number };
  inpatient: { avgStay: number };
  emergency: { triageTime: number };
  imaging: { turnaround: number };
  surgery: { eras: number };
  pharmacy: { waitTime: number };
  billing: { online: number };
  digital: { optimized: number };
  suggestions: string[];
}

/**
 * 构建流程优化报告。
 *
 * @param timeRange 时间范围
 * @returns 流程优化报告
 */
export function buildProcessOptimizationReport(timeRange: string): ProcessOptimizationReport {
  return {
    timeRange,
    outpatient: { waitTime: 25 },
    inpatient: { avgStay: 8 },
    emergency: { triageTime: 5 },
    imaging: { turnaround: 120 },
    surgery: { eras: 30 },
    pharmacy: { waitTime: 10 },
    billing: { online: 80 },
    digital: { optimized: 15 },
    suggestions: ['推行先检查后诊疗', '推广床旁结算'],
  };
}
