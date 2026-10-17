/**
 * 健澜科技 jlmedaios - 经验复用效果度量 V13 纯函数（M295-D）
 *
 * measureReuseEffectV13 / computeErrorReductionV13 / buildReuseROIV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 推送日志 */
export interface PushLogV13 {
  pushId: string;
  experienceId: string;
}

/** 采纳日志 */
export interface AdoptionLogV13 {
  pushId: string;
  adopted: boolean;
}

/** 复用效果 */
export interface ReuseEffectV13 {
  pushedCount: number;
  adoptedCount: number;
  adoptionRate: number;
}

/** ROI 看板 */
export interface ReuseROIV13 {
  adoptionRate: number;
  errorReductionPct: number;
  valueRating: "high" | "mid" | "low";
}

/**
 * 复用效果度量（纯函数）：pushedCount/adoptedCount/adoptionRate。
 *
 * @param pushLog 推送日志
 * @param adoptionLog 采纳日志（按 pushId 匹配）
 * @returns 效果
 */
export function measureReuseEffectV13(
  pushLog: PushLogV13[],
  adoptionLog: AdoptionLogV13[],
): ReuseEffectV13 {
  const adoptedPushIds = new Set(adoptionLog.filter((a) => a.adopted).map((a) => a.pushId));
  const adoptedCount = pushLog.filter((p) => adoptedPushIds.has(p.pushId)).length;
  const total = pushLog.length;
  const rate = total === 0 ? 0 : Math.round((adoptedCount / total) * 1000) / 10;
  return {
    pushedCount: total,
    adoptedCount,
    adoptionRate: rate,
  };
}

/**
 * 错误率下降（纯函数）：beforeRate - afterRate，负数表示改善。
 *
 * @param beforeRate 之前错误率%
 * @param afterRate 之后错误率%
 * @returns 差值（负数=改善）
 */
export function computeErrorReductionV13(beforeRate: number, afterRate: number): number {
  return Math.round((beforeRate - afterRate) * 10) / 10;
}

/**
 * ROI 评级（纯函数）：adoptionRate≥60 且 errorReduction>5 → high；≥40 且 >2 → mid；否则 low。
 *
 * @param effect 效果
 * @param errorReductionPct 错误下降百分点
 * @returns ROI 看板
 */
export function buildReuseROIV13(effect: ReuseEffectV13, errorReductionPct: number): ReuseROIV13 {
  let valueRating: "high" | "mid" | "low" = "low";
  if (effect.adoptionRate >= 60 && errorReductionPct > 5) valueRating = "high";
  else if (effect.adoptionRate >= 40 && errorReductionPct > 2) valueRating = "mid";
  return {
    adoptionRate: effect.adoptionRate,
    errorReductionPct,
    valueRating,
  };
}
