/**
 * 健澜科技 jlmedaios - 老年健康全周期 V3 纯函数（M239-C）
 *
 * buildGeriatricsLifecycleV3Report / assessFrailtyV3 / assessCognitionV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估衰弱 V3（纯函数）。
 *
 * @param criteria Fried 标准
 * @returns 衰弱
 */
export function assessFrailtyV3(criteria: { weightLoss: boolean; exhaustion: boolean; weakness: boolean; slowWalking: boolean; lowActivity: boolean }): { score: number; level: string } {
  let score = 0;
  if (criteria.weightLoss) score += 1;
  if (criteria.exhaustion) score += 1;
  if (criteria.weakness) score += 1;
  if (criteria.slowWalking) score += 1;
  if (criteria.lowActivity) score += 1;
  let level = "健壮";
  if (score >= 3) level = "衰弱";
  else if (score >= 1) level = "衰弱前期";
  return { score, level };
}

/**
 * 评估认知 V3（纯函数）。
 *
 * @param mmse MMSE
 * @param moca MoCA
 * @returns 认知
 */
export function assessCognitionV3(mmse: number, moca: number): { mmse: string; moca: string } {
  let mmseLevel = "正常";
  if (mmse < 27) mmseLevel = "认知障碍";
  let mocaLevel = "正常";
  if (moca < 26) mocaLevel = "轻度认知障碍";
  return { mmse: mmseLevel, moca: mocaLevel };
}

/** 老年全周期 V3 报告输出 */
export interface GeriatricsLifecycleV3Report {
  timeRange: string;
  cga: number;
  frailty: { robust: number; preFrail: number; frail: number };
  disability: { adl: number; iadl: number };
  syndrome: { fall: number; delirium: number; pain: number };
  cognition: { mmse: number; moca: number };
  pim: number;
  hospice: number;
  suggestions: string[];
}

/**
 * 构建老年全周期 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 老年全周期 V3 报告
 */
export function buildGeriatricsLifecycleV3Report(timeRange: string): GeriatricsLifecycleV3Report {
  return {
    timeRange,
    cga: 20000,
    frailty: { robust: 8000, preFrail: 8000, frail: 4000 },
    disability: { adl: 5000, iadl: 8000 },
    syndrome: { fall: 1000, delirium: 300, pain: 3000 },
    cognition: { mmse: 5000, moca: 4000 },
    pim: 2000,
    hospice: 500,
    suggestions: ["扩大CGA评估覆盖", "降低跌倒发生率"],
  };
}
