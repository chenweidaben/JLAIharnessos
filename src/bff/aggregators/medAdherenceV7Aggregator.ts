/**
 * 健澜科技 jlmedaios - 患者用药教育与依从性随访 V7 纯函数（M289-D）
 *
 * computeAdherenceRateV7 / classifyAdherenceV7 / buildMedEduV7
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 用药教育材料 */
export interface MedEduMaterial {
  drugCode: string;
  title: string;
  level: "basic" | "simple" | "deep";
  body: string;
}

/**
 * 依从率 V7（纯函数）：taken/prescribed×100，保留一位小数。
 *
 * @param prescribed 应服药次数
 * @param taken 实服药次数
 * @returns 依从率%
 */
export function computeAdherenceRateV7(prescribed: number, taken: number): number {
  if (prescribed <= 0) return 0;
  return Math.round((taken / prescribed) * 1000) / 10;
}

/**
 * 依从性分级 V7（纯函数）：≥80 good / 50-79 fair / <50 poor。
 *
 * @param rate 依从率%
 * @returns 分级
 */
export function classifyAdherenceV7(rate: number): "good" | "fair" | "poor" {
  if (rate >= 80) return "good";
  if (rate >= 50) return "fair";
  return "poor";
}

/**
 * 用药教育材料匹配 V7（纯函数）：按 drugCode 过滤；患者含 elderly 时优先 level=simple。
 *
 * @param materials 材料列表
 * @param drugCode 目标药品
 * @param patientTags 患者标签
 * @returns 排序后材料
 */
export function buildMedEduV7(
  materials: MedEduMaterial[],
  drugCode: string,
  patientTags: string[],
): MedEduMaterial[] {
  const matched = materials.filter((m) => m.drugCode === drugCode);
  const preferSimple = patientTags.includes("elderly");
  return matched.sort((a, b) => {
    const aScore = preferSimple && a.level === "simple" ? 0 : a.level === "basic" ? 1 : 2;
    const bScore = preferSimple && b.level === "simple" ? 0 : b.level === "basic" ? 1 : 2;
    return aScore - bScore;
  });
}
