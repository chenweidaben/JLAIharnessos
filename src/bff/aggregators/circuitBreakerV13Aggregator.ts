/**
 * 健澜科技 jlmedaios - 反向证据熔断 V13 纯函数（M300-C）
 *
 * detectReverseEvidenceV13 / triggerCircuitBreakerV13 / buildCircuitBreakerReportV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 熔断经验 */
export interface BrokenExpV13 {
  experienceId: string;
  title: string;
  effectSize: number;
  status: "circuit_broken";
}

/** 熔断报告 */
export interface CircuitBreakerReportV13 {
  brokenCount: number;
  avgEffectSize: number;
  action: string;
}

/**
 * 反向证据检测（纯函数）：effectSize > 0（used 组并发症率更高）→ reverse=true。
 *
 * @param effectSize 效应量
 * @returns 是否反向
 */
export function detectReverseEvidenceV13(effectSize: number): boolean {
  return effectSize > 0;
}

/**
 * 触发熔断（纯函数）：status="circuit_broken"。
 *
 * @param experienceId 经验ID
 * @param title 标题
 * @param effectSize 效应量
 * @returns 熔断经验
 */
export function triggerCircuitBreakerV13(
  experienceId: string,
  title: string,
  effectSize: number,
): BrokenExpV13 {
  return {
    experienceId,
    title,
    effectSize,
    status: "circuit_broken",
  };
}

/**
 * 熔断报告（纯函数）：熔断数 + 平均升高率 + 建议动作。
 *
 * @param brokenExperiences 熔断列表
 * @returns 报告
 */
export function buildCircuitBreakerReportV13(
  brokenExperiences: BrokenExpV13[],
): CircuitBreakerReportV13 {
  const brokenCount = brokenExperiences.length;
  const avg = brokenCount === 0
    ? 0
    : Math.round(brokenExperiences.reduce((s, e) => s + e.effectSize, 0) / brokenCount * 10) / 10;
  const action = brokenCount === 0
    ? "无反向经验，系统正常"
    : `立即下线 ${brokenCount} 条反向经验，停止推送并通知原作者复核`;
  return { brokenCount, avgEffectSize: avg, action };
}
