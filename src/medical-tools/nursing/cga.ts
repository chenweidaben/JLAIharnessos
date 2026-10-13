/**
 * 健澜科技 jlmedaios - 老年综合评估 CGA 纯函数（M56-A）
 *
 * 六维评分：ADL / IADL / MMSE / 跌倒风险 / MNA 营养 / GDS 抑郁。
 * 风险分级：任一高危项命中 -> high；若干中危 -> moderate；否则 low。
 * 纯函数无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type CgaRiskLevel = 'low' | 'moderate' | 'high';

export interface CgaInput {
  adlScore: number;
  iadlScore: number;
  mmseScore: number;
  fallRisk: boolean;
  mnaScore: number;
  gdsScore: number;
}

/** 命中高危项即 high。 */
export function riskLevel(i: CgaInput): CgaRiskLevel {
  if (i.adlScore < 60 || i.mmseScore < 24 || i.fallRisk || i.mnaScore < 12 || i.gdsScore >= 5) {
    return 'high';
  }
  if (i.iadlScore < 8 || i.adlScore < 80 || i.mmseScore < 27 || i.mnaScore < 12) {
    return 'moderate';
  }
  return 'low';
}

/** 各维命中的 flags（供前端标红/工单依据）。 */
export function flags(i: CgaInput): string[] {
  const out: string[] = [];
  if (i.adlScore < 60) out.push('adl_dependent');
  if (i.iadlScore < 8) out.push('iadl_declined');
  if (i.mmseScore < 24) out.push('cognitive_impairment');
  if (i.fallRisk) out.push('fall_risk');
  if (i.mnaScore < 12) out.push('malnutrition');
  if (i.gdsScore >= 5) out.push('depression_screen');
  return out;
}

/** 是否需要老年综合干预工单。 */
export function needsIntervention(i: CgaInput): boolean {
  return riskLevel(i) === 'high';
}
