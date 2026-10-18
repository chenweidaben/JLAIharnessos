/**
 * 健澜科技 jlmedaios - 营养质量管理 V13 纯函数（M430-C，-quality 后缀避让旧版 nutritionMgmtV13（M415））
 *
 * computeNutritionAssessmentCoverageRateV13 / computeNutritionSupportAppropriateRateV13 / computeNutritionConsultationResponseRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 营养质量管理记录 */
export interface NutritionQualityMgmtRecordV13 {
  assessed: number;
  inpatientTotal: number;
  appropriate: number;
  supportTotal: number;
  responded: number;
  consultTotal: number;
}

/**
 * 营养评估覆盖率（纯函数）：已评估患者数/住院患者总数×100，保留 2 位小数。
 *
 * @param records 营养质量管理记录列表
 * @returns 营养评估覆盖率百分比
 */
export function computeNutritionAssessmentCoverageRateV13(records: NutritionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessed, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 营养支持合理率（纯函数）：合理营养支持数/营养支持总数×100，保留 2 位小数。
 *
 * @param records 营养质量管理记录列表
 * @returns 营养支持合理率百分比
 */
export function computeNutritionSupportAppropriateRateV13(records: NutritionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.supportTotal, 0);
  if (total === 0) return 0;
  const appropriate = records.reduce((acc, r) => acc + r.appropriate, 0);
  return Math.round((appropriate / total) * 10000) / 100;
}

/**
 * 营养会诊响应率（纯函数）：已响应会诊数/会诊总数×100，保留 2 位小数。
 *
 * @param records 营养质量管理记录列表
 * @returns 营养会诊响应率百分比
 */
export function computeNutritionConsultationResponseRateV13(records: NutritionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.consultTotal, 0);
  if (total === 0) return 0;
  const responded = records.reduce((acc, r) => acc + r.responded, 0);
  return Math.round((responded / total) * 10000) / 100;
}
