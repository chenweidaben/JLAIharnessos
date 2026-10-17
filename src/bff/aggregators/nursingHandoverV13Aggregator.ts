/**
 * 健澜科技 jlmedaios - 护理交班质量 V13 纯函数（M315-D）
 *
 * computeSbarCompletenessV13 / identifyHandoverOmissionsV13 / gradeHandoverQualityV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理交班单 */
export interface NursingHandoverV13 {
  patientId: string;
  s: string;
  b: string;
  a: string;
  r: string;
  pressureUlcerHandedOver: boolean;
  fallHandedOver: boolean;
  vteHandedOver: boolean;
}

/** SBAR 要素 */
export const SBAR_FIELDS_V13: (keyof NursingHandoverV13)[] = ["s", "b", "a", "r"];

/** 风险要素 */
export const RISK_FIELDS_V13: { key: keyof NursingHandoverV13; label: string }[] = [
  { key: "pressureUlcerHandedOver", label: "压疮" },
  { key: "fallHandedOver", label: "跌倒" },
  { key: "vteHandedOver", label: "VTE" },
];

/**
 * SBAR 要素齐全率（纯函数）：S/B/A/R 四要素已填数/4×100。
 *
 * @param handover 交班单
 * @returns 齐全率百分比
 */
export function computeSbarCompletenessV13(handover: NursingHandoverV13): number {
  const filled = SBAR_FIELDS_V13.filter((f) => (handover[f] ?? "").toString().trim() !== "").length;
  return Math.round((filled / SBAR_FIELDS_V13.length) * 100);
}

/**
 * 风险交班遗漏统计（纯函数）：压疮/跌倒/VTE 任一未交班 → 遗漏。
 *
 * @param handover 交班单
 * @returns 遗漏风险名列表
 */
export function identifyHandoverOmissionsV13(handover: NursingHandoverV13): string[] {
  return RISK_FIELDS_V13.filter((rf) => !handover[rf.key]).map((rf) => rf.label);
}

/**
 * 等级（纯函数）：≥90 优 / 70-90 良 / <70 待改进。
 *
 * @param score 齐全率
 * @returns 等级
 */
export function gradeHandoverQualityV13(score: number): string {
  if (score >= 90) return "优";
  if (score >= 70) return "良";
  return "待改进";
}
