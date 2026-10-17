/**
 * 健澜科技 jlmedaios - 抗菌药物管理 V13 纯函数（M357-D，M357 收官）
 *
 * computeAntibioticDddsV13 / computeRestrictedClassRateV13 / computeTherapeuticMicrobiologyTestRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物管理记录 */
export interface AntibioticMgmtRecordV13 {
  ddds: number;
  restrictedUseQuantity: number;
  totalAntibioticQuantity: number;
  therapeuticMicrobiologyTested: number;
  therapeuticUseCount: number;
}

/**
 * 抗菌药物使用强度 DDDs（纯函数）：求和，保留 2 位小数。
 *
 * @param records 抗菌药物管理记录列表
 * @returns DDDs 总量
 */
export function computeAntibioticDddsV13(records: AntibioticMgmtRecordV13[]): number {
  const sum = records.reduce((acc, r) => acc + r.ddds, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * 限制级使用率（纯函数）：限制级使用量/抗菌药总用量×100，保留 2 位小数。
 *
 * @param records 抗菌药物管理记录列表
 * @returns 限制级使用率百分比
 */
export function computeRestrictedClassRateV13(records: AntibioticMgmtRecordV13[]): number {
  const restricted = records.reduce((acc, r) => acc + r.restrictedUseQuantity, 0);
  const total = records.reduce((acc, r) => acc + r.totalAntibioticQuantity, 0);
  if (total === 0) return 0;
  return Math.round((restricted / total) * 10000) / 100;
}

/**
 * 治疗性使用微生物送检率（纯函数）：送检数/治疗性使用数×100，保留 2 位小数。
 *
 * @param records 抗菌药物管理记录列表
 * @returns 治疗性使用微生物送检率百分比
 */
export function computeTherapeuticMicrobiologyTestRateV13(records: AntibioticMgmtRecordV13[]): number {
  const tested = records.reduce((acc, r) => acc + r.therapeuticMicrobiologyTested, 0);
  const therapeutic = records.reduce((acc, r) => acc + r.therapeuticUseCount, 0);
  if (therapeutic === 0) return 0;
  return Math.round((tested / therapeutic) * 10000) / 100;
}
