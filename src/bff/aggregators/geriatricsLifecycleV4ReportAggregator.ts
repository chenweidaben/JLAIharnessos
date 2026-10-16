/**
 * 健澜科技 jlmedaios - 老年全周期 V4 纯函数（M249-C）
 *
 * buildGeriatricsLifecycleV4Report / assessFrailtyV4 / assessCognitionV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估衰弱 V4（纯函数）。
 *
 * @param criteria 标准
 * @returns 衰弱
 */
export function assessFrailtyV4(criteria: { grip: number; speed: number; sppb: number }): { score: number; level: string } {
  let score = 0;
  if (criteria.grip < 28) score += 1;
  if (criteria.speed < 0.8) score += 1;
  if (criteria.sppb < 9) score += 1;
  let level = "健壮";
  if (score >= 2) level = "衰弱";
  else if (score === 1) level = "衰弱前期";
  return { score, level };
}

/**
 * 评估认知 V4（纯函数）。
 *
 * @param mmse MMSE
 * @param moca MoCA
 * @returns 认知
 */
export function assessCognitionV4(mmse: number, moca: number): { mmse: number; moca: number; impairment: boolean } {
  return { mmse, moca, impairment: mmse < 27 || moca < 26 };
}

/** 老年 V4 报告输出 */
export interface GeriatricsLifecycleV4Report {
  timeRange: string;
  cga: { patients: number; frail: number; sarcopenia: number };
  disability: { adl: number; iadl: number; longTerm: number };
  syndrome: { fall: number; pressure: number; dementia: number; incontinence: number };
  medication: { pim: number; deprescribing: number };
  hospice: { advanceDirective: number; dnR: number };
  suggestions: string[];
}

/**
 * 构建老年 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 老年 V4 报告
 */
export function buildGeriatricsLifecycleV4Report(timeRange: string): GeriatricsLifecycleV4Report {
  return {
    timeRange,
    cga: { patients: 2000, frail: 300, sarcopenia: 500 },
    disability: { adl: 200, iadl: 400, longTerm: 100 },
    syndrome: { fall: 150, pressure: 50, dementia: 300, incontinence: 100 },
    medication: { pim: 80, deprescribing: 60 },
    hospice: { advanceDirective: 50, dnR: 30 },
    suggestions: ["提升 CGA 覆盖率", "减少 PIM 用药"],
  };
}
