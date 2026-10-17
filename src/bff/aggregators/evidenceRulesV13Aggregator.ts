/**
 * 健澜科技 jlmedaios - 疗效证据反哺规则权重 V13 纯函数（M300-B）
 *
 * adjustWeightByEvidenceV13 / buildEvidenceDrivenRuleV13 / filterEvidenceBasedRulesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 证据强度 */
export type EvidenceLevelV13 = "strong" | "moderate" | "weak" | "inconclusive" | "reverse";

/** 证据驱动规则 */
export interface EvidenceRuleV13 {
  experienceId: string;
  baseWeight: number;
  adjustedWeight: number;
  evidenceLevel: EvidenceLevelV13;
}

/**
 * 按证据强度调权（纯函数）：strong +0.15 / moderate +0.08 / weak +0.02 / inconclusive 不变 / reverse −0.10，保留2位。
 *
 * @param baseWeight 基础权重
 * @param evidenceLevel 证据强度
 * @returns 调整后权重
 */
export function adjustWeightByEvidenceV13(
  baseWeight: number,
  evidenceLevel: EvidenceLevelV13,
): number {
  const delta: Record<EvidenceLevelV13, number> = {
    strong: 0.15,
    moderate: 0.08,
    weak: 0.02,
    inconclusive: 0,
    reverse: -0.10,
  };
  return Math.round((baseWeight + delta[evidenceLevel]) * 100) / 100;
}

/**
 * 生成证据驱动规则（纯函数）。
 *
 * @param experienceId 经验ID
 * @param baseWeight 基础权重
 * @param evidenceLevel 证据强度
 * @returns 规则
 */
export function buildEvidenceDrivenRuleV13(
  experienceId: string,
  baseWeight: number,
  evidenceLevel: EvidenceLevelV13,
): EvidenceRuleV13 {
  return {
    experienceId,
    baseWeight,
    adjustedWeight: adjustWeightByEvidenceV13(baseWeight, evidenceLevel),
    evidenceLevel,
  };
}

/**
 * 证据过滤（纯函数）：只保留 evidenceLevel !== "inconclusive"。
 *
 * @param rules 规则列表
 * @returns 有证据支撑的规则
 */
export function filterEvidenceBasedRulesV13(rules: EvidenceRuleV13[]): EvidenceRuleV13[] {
  return rules.filter((r) => r.evidenceLevel !== "inconclusive");
}
