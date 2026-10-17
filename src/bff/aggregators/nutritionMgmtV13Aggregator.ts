/**
 * 健澜科技 jlmedaios - 营养管理 V13 纯函数（M415-D，M415 收官）
 *
 * computeAdmissionNutritionRiskScreeningRateV13 / computeNutritionTherapyAssessmentRateV13 / computeEnteralNutritionImplementationPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 营养管理记录 */
export interface NutritionMgmtRecordV13 {
  screened: number;
  admissionTotal: number;
  assessed: number;
  needNutritionTherapyTotal: number;
  qualified: number;
  enteralTotal: number;
}

/**
 * 入院营养风险筛查率（纯函数）：已筛查人数/入院总人数×100，保留 2 位小数。
 *
 * @param records 营养管理记录列表
 * @returns 入院营养风险筛查率百分比
 */
export function computeAdmissionNutritionRiskScreeningRateV13(records: NutritionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.admissionTotal, 0);
  if (total === 0) return 0;
  const screened = records.reduce((acc, r) => acc + r.screened, 0);
  return Math.round((screened / total) * 10000) / 100;
}

/**
 * 营养治疗评估率（纯函数）：已评估人数/需营养治疗人数×100，保留 2 位小数。
 *
 * @param records 营养管理记录列表
 * @returns 营养治疗评估率百分比
 */
export function computeNutritionTherapyAssessmentRateV13(records: NutritionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.needNutritionTherapyTotal, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessed, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 肠内营养实施合格率（纯函数）：合格例数/肠内营养总数×100，保留 2 位小数。
 *
 * @param records 营养管理记录列表
 * @returns 肠内营养实施合格率百分比
 */
export function computeEnteralNutritionImplementationPassRateV13(records: NutritionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.enteralTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
