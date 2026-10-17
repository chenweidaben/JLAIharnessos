/**
 * 健澜科技 jlmedaios - AI 辅助治疗 V13 纯函数（M366-B）
 *
 * computeAiTreatmentPlanRecommendRateV13 / computeAiEfficacyPredictAccuracyV13 / computeAiMedicationAdviceAdoptionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 辅助治疗记录 */
export interface AiTreatmentRecordV13 {
  treatmentPlanCount: number;
  aiRecommended: number;
  aiEfficacyPredictAccurate: number;
  aiMedicationAdopted: number;
}

/**
 * AI 方案推荐率（纯函数）：AI 推荐方案数/治疗方案数×100，保留 2 位小数。
 *
 * @param records AI 辅助治疗记录列表
 * @returns AI 方案推荐率百分比
 */
export function computeAiTreatmentPlanRecommendRateV13(records: AiTreatmentRecordV13[]): number {
  const plans = records.reduce((acc, r) => acc + r.treatmentPlanCount, 0);
  if (plans === 0) return 0;
  const recommended = records.reduce((acc, r) => acc + r.aiRecommended, 0);
  return Math.round((recommended / plans) * 10000) / 100;
}

/**
 * AI 疗效预测准确率（纯函数）：准确数/预测数×100，保留 2 位小数。
 *
 * @param records AI 辅助治疗记录列表
 * @returns AI 疗效预测准确率百分比
 */
export function computeAiEfficacyPredictAccuracyV13(records: AiTreatmentRecordV13[]): number {
  const predicted = records.reduce((acc, r) => acc + r.aiRecommended, 0);
  if (predicted === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.aiEfficacyPredictAccurate, 0);
  return Math.round((accurate / predicted) * 10000) / 100;
}

/**
 * AI 用药建议采纳率（纯函数）：采纳数/建议数×100，保留 2 位小数。
 *
 * @param records AI 辅助治疗记录列表
 * @returns AI 用药建议采纳率百分比
 */
export function computeAiMedicationAdviceAdoptionRateV13(records: AiTreatmentRecordV13[]): number {
  const suggested = records.reduce((acc, r) => acc + r.aiRecommended, 0);
  if (suggested === 0) return 0;
  const adopted = records.reduce((acc, r) => acc + r.aiMedicationAdopted, 0);
  return Math.round((adopted / suggested) * 10000) / 100;
}
