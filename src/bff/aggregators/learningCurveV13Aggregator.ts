/**
 * 健澜科技 jlmedaios - 个人学习曲线 V13 纯函数（M303-C）
 *
 * buildLearningCurveV13 / computeLearningSlopeV13 / identifyLearningPlateauV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 每周采纳 */
export interface WeeklyAdoptionV13 {
  weekLabel: string;
  adoptionRate: number;
}

/** 学习曲线点 */
export interface LearningCurvePointV13 {
  weekLabel: string;
  adoptionRate: number;
}

/**
 * 构建学习曲线（纯函数）：直接透传。
 *
 * @param weeklyAdoption 每周采纳
 * @returns 曲线点
 */
export function buildLearningCurveV13(weeklyAdoption: WeeklyAdoptionV13[]): LearningCurvePointV13[] {
  return weeklyAdoption.map((w) => ({ weekLabel: w.weekLabel, adoptionRate: w.adoptionRate }));
}

/**
 * 学习斜率（纯函数）：末周 - 首周，保留1位。
 *
 * @param curve 曲线
 * @returns 斜率
 */
export function computeLearningSlopeV13(curve: LearningCurvePointV13[]): number {
  if (curve.length < 2) return 0;
  return Math.round((curve[curve.length - 1].adoptionRate - curve[0].adoptionRate) * 10) / 10;
}

/**
 * 平台期识别（纯函数）：slope<2 → "学习进入平台期，建议换学习材料"。
 *
 * @param slope 学习斜率
 * @returns 平台期提示（无则空串）
 */
export function identifyLearningPlateauV13(slope: number): string {
  if (slope < 2) return "学习进入平台期，建议换学习材料";
  return "";
}
