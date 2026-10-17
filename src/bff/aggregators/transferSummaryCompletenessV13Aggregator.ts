/**
 * 健澜科技 jlmedaios - 转科交接单完整度评分 V13 纯函数（M315-C）
 *
 * computeTransferCompletenessScoreV13 / identifyMissingTransferFieldsV13 / gradeTransferSummaryV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 转科交接单 */
export interface TransferSummaryV13 {
  patientId: string;
  diagnosis: string;
  medications: string;
  nursingNotes: string;
  allergyHistory: string;
  riskAssessment: string;
}

/** 必填项字段列表 */
export const REQUIRED_FIELDS_V13: (keyof TransferSummaryV13)[] = [
  "diagnosis",
  "medications",
  "nursingNotes",
  "allergyHistory",
  "riskAssessment",
];

/** 字段名中文映射 */
export const FIELD_LABELS_V13: Record<keyof TransferSummaryV13, string> = {
  patientId: "患者ID",
  diagnosis: "诊断",
  medications: "用药",
  nursingNotes: "护理要点",
  allergyHistory: "过敏史",
  riskAssessment: "风险评估",
};

/**
 * 完整度评分（纯函数）：必填项已填数/总必填项×100。
 *
 * @param summary 交接单
 * @returns 完整度百分比
 */
export function computeTransferCompletenessScoreV13(summary: TransferSummaryV13): number {
  const filled = REQUIRED_FIELDS_V13.filter((f) => (summary[f] ?? "").trim() !== "").length;
  return Math.round((filled / REQUIRED_FIELDS_V13.length) * 100);
}

/**
 * 缺失必填项列表（纯函数）：未填字段名。
 *
 * @param summary 交接单
 * @returns 缺失字段中文名列表
 */
export function identifyMissingTransferFieldsV13(summary: TransferSummaryV13): string[] {
  return REQUIRED_FIELDS_V13.filter((f) => (summary[f] ?? "").trim() === "").map(
    (f) => FIELD_LABELS_V13[f],
  );
}

/**
 * 等级（纯函数）：≥90 完整 / 70-90 部分完整 / <70 不完整。
 *
 * @param score 完整度
 * @returns 等级
 */
export function gradeTransferSummaryV13(score: number): string {
  if (score >= 90) return "完整";
  if (score >= 70) return "部分完整";
  return "不完整";
}
