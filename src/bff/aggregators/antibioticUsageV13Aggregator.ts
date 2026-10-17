/**
 * 健澜科技 jlmedaios - 抗菌药物使用 V13 纯函数（M388-B）
 *
 * computeInpatientAntibioticUsageRateV13 / computeOutpatientAntibioticPrescriptionRateV13 / computeAntibioticDDDV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物使用记录 */
export interface AntibioticUsageRecordV13 {
  inpatientUsageCount: number;
  dischargeCount: number;
  antibioticRxCount: number;
  totalRxCount: number;
  totalDdd: number;
  avgStayDays: number;
}

/**
 * 住院抗菌药物使用率（纯函数）：使用人数/出院人数×100，保留 2 位小数。
 *
 * @param records 抗菌药物使用记录列表
 * @returns 住院抗菌药物使用率百分比
 */
export function computeInpatientAntibioticUsageRateV13(records: AntibioticUsageRecordV13[]): number {
  const discharge = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (discharge === 0) return 0;
  const usage = records.reduce((acc, r) => acc + r.inpatientUsageCount, 0);
  return Math.round((usage / discharge) * 10000) / 100;
}

/**
 * 门诊抗菌药物处方率（纯函数）：抗菌药物处方数/门诊处方总数×100，保留 2 位小数。
 *
 * @param records 抗菌药物使用记录列表
 * @returns 门诊抗菌药物处方率百分比
 */
export function computeOutpatientAntibioticPrescriptionRateV13(records: AntibioticUsageRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRxCount, 0);
  if (total === 0) return 0;
  const antibiotic = records.reduce((acc, r) => acc + r.antibioticRxCount, 0);
  return Math.round((antibiotic / total) * 10000) / 100;
}

/**
 * 抗菌药物使用强度 DDD（纯函数）：总 DDD 数/出院人数/天数，保留 2 位小数。
 *
 * @param records 抗菌药物使用记录列表
 * @returns 抗菌药物使用强度 DDD
 */
export function computeAntibioticDDDV13(records: AntibioticUsageRecordV13[]): number {
  const discharge = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  const stayDays = records.reduce((acc, r) => acc + r.avgStayDays, 0);
  if (discharge === 0 || stayDays === 0) return 0;
  const ddd = records.reduce((acc, r) => acc + r.totalDdd, 0);
  return Math.round((ddd / discharge / stayDays) * 100) / 100;
}
