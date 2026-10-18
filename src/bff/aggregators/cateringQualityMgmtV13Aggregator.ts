/**
 * 健澜科技 jlmedaios - 膳食质量管理 V13 纯函数（M437-A，后勤保障与环境管理深化组）
 *
 * computeCateringQualifiedRateV13 / computeCateringPatientSatisfactionRateV13 / computeCateringCostControlRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 膳食质量管理记录 */
export interface CateringQualityMgmtRecordV13 {
  qualifiedMeals: number;
  totalMeals: number;
  satisfiedPatients: number;
  surveyedPatients: number;
  actualCost: number;
  budgetCost: number;
}

/**
 * 膳食合格率（纯函数）：合格餐次数/供餐总次数×100，保留 2 位小数。
 *
 * @param records 膳食质量管理记录列表
 * @returns 膳食合格率百分比
 */
export function computeCateringQualifiedRateV13(records: CateringQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMeals, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedMeals, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 患者膳食满意度（纯函数）：满意患者数/调查患者总数×100，保留 2 位小数。
 *
 * @param records 膳食质量管理记录列表
 * @returns 患者膳食满意度百分比
 */
export function computeCateringPatientSatisfactionRateV13(records: CateringQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedPatients, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedPatients, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 膳食成本控制率（纯函数，反向指标，越低越好）：实际成本/预算成本×100，保留 2 位小数。
 *
 * @param records 膳食质量管理记录列表
 * @returns 膳食成本控制率百分比
 */
export function computeCateringCostControlRateV13(records: CateringQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.budgetCost, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualCost, 0);
  return Math.round((actual / total) * 10000) / 100;
}
