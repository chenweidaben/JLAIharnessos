/**
 * 健澜科技 jlmedaios - 疗效证据总览 V13 纯函数（M300-D）
 *
 * buildEvidenceOverviewV13 / computeEvidenceCoverageV13 / identifyEvidenceGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 证据强度标签 */
export type EvidenceStrengthV13 = "strong" | "moderate" | "weak" | "inconclusive";

/** 证据条目（排名榜） */
export interface EvidenceRankItemV13 {
  experienceId: string;
  effectSize: number;
  strength: EvidenceStrengthV13;
}

/** 证据驱动规则 */
export interface EvidenceRuleItemV13 {
  experienceId: string;
  evidenceLevel: "strong" | "moderate" | "weak" | "inconclusive" | "reverse";
}

/** 熔断经验 */
export interface CircuitBreakItemV13 {
  experienceId: string;
}

/** 总览 */
export interface EvidenceOverviewV13 {
  strongCount: number;
  moderateCount: number;
  weakCount: number;
  inconclusiveCount: number;
  circuitBrokenCount: number;
}

/**
 * 证据总览（纯函数）：按 strength 统计 + 熔断数。
 *
 * @param ranks 证据榜
 * @param rules 证据规则（用于统计 strong 规则数）
 * @param circuitBreaks 熔断列表
 * @returns 总览
 */
export function buildEvidenceOverviewV13(
  ranks: EvidenceRankItemV13[],
  rules: EvidenceRuleItemV13[],
  circuitBreaks: CircuitBreakItemV13[],
): EvidenceOverviewV13 {
  void rules;
  return {
    strongCount: ranks.filter((r) => r.strength === "strong").length,
    moderateCount: ranks.filter((r) => r.strength === "moderate").length,
    weakCount: ranks.filter((r) => r.strength === "weak").length,
    inconclusiveCount: ranks.filter((r) => r.strength === "inconclusive").length,
    circuitBrokenCount: circuitBreaks.length,
  };
}

/**
 * 证据覆盖率（纯函数）：strongRules/totalRules×100，保留1位。
 *
 * @param strongRules 强证据规则数
 * @param totalRules 总规则数
 * @returns 覆盖率%
 */
export function computeEvidenceCoverageV13(strongRules: number, totalRules: number): number {
  if (totalRules === 0) return 0;
  return Math.round((strongRules / totalRules) * 1000) / 10;
}

/**
 * 证据缺口识别（纯函数）：strong<3 → "强证据经验不足"；circuitBroken>0 → "存在反向经验需复盘"。
 *
 * @param overview 总览
 * @returns 缺口描述（无则空串）
 */
export function identifyEvidenceGapV13(overview: EvidenceOverviewV13): string {
  if (overview.circuitBrokenCount > 0) {
    return `存在反向经验需复盘：${overview.circuitBrokenCount} 条已熔断`;
  }
  if (overview.strongCount < 3) {
    return "强证据经验不足：建议积累更多 RCT 级证据";
  }
  return "";
}
