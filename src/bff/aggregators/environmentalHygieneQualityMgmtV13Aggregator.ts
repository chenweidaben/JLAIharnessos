/**
 * 健澜科技 jlmedaios - 环境卫生质量管理 V13 纯函数（M437-C，后勤保障与环境管理深化组）
 *
 * computeEnvironmentalHygieneMonitoringQualifiedRateV13 / computeEnvironmentalHygieneCleaningQualifiedRateV13 / computeEnvironmentalHygieneSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 环境卫生质量管理记录 */
export interface EnvironmentalHygieneQualityMgmtRecordV13 {
  qualifiedMonitoring: number;
  totalMonitoring: number;
  qualifiedCleaning: number;
  totalCleaning: number;
  satisfiedPatients: number;
  surveyedPatients: number;
}

/**
 * 环境监测合格率（纯函数）：合格监测次数/监测总次数×100，保留 2 位小数。
 *
 * @param records 环境卫生质量管理记录列表
 * @returns 环境监测合格率百分比
 */
export function computeEnvironmentalHygieneMonitoringQualifiedRateV13(records: EnvironmentalHygieneQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMonitoring, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedMonitoring, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 保洁合格率（纯函数）：合格保洁区域数/保洁区域总数×100，保留 2 位小数。
 *
 * @param records 环境卫生质量管理记录列表
 * @returns 保洁合格率百分比
 */
export function computeEnvironmentalHygieneCleaningQualifiedRateV13(records: EnvironmentalHygieneQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCleaning, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedCleaning, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 满意度（纯函数）：满意患者数/调查患者总数×100，保留 2 位小数。
 *
 * @param records 环境卫生质量管理记录列表
 * @returns 满意度百分比
 */
export function computeEnvironmentalHygieneSatisfactionRateV13(records: EnvironmentalHygieneQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedPatients, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedPatients, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}
