/**
 * 健澜科技 jlmedaios - 抗菌药物处方率 V13 纯函数（M336-C）
 *
 * computeOutpatientRxRateV13 / computeInpatientUseRateV13 / computeTypeIPreventiveRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物处方率记录 */
export interface AntibioticRxRecordV13 {
  outpatientTotalRx: number;
  outpatientAntibioticRx: number;
  inpatientTotalPatients: number;
  inpatientAntibioticPatients: number;
  typeITotalIncisions: number;
  typeIPreventiveUse: number;
}

/**
 * 门诊处方率（纯函数）：含抗菌药物处方数/总门诊处方数×100。
 *
 * @param records 抗菌药物处方率记录列表
 * @returns 门诊处方率百分比
 */
export function computeOutpatientRxRateV13(records: AntibioticRxRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientTotalRx, 0);
  const antibiotic = records.reduce((acc, r) => acc + r.outpatientAntibioticRx, 0);
  if (total === 0) return 0;
  return Math.round((antibiotic / total) * 100);
}

/**
 * 住院使用率（纯函数）：使用抗菌药物患者数/住院患者数×100。
 *
 * @param records 抗菌药物处方率记录列表
 * @returns 住院使用率百分比
 */
export function computeInpatientUseRateV13(records: AntibioticRxRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotalPatients, 0);
  const antibiotic = records.reduce((acc, r) => acc + r.inpatientAntibioticPatients, 0);
  if (total === 0) return 0;
  return Math.round((antibiotic / total) * 100);
}

/**
 * Ⅰ类切口预防使用率（纯函数）：预防使用数/Ⅰ类切口总数×100。
 *
 * @param records 抗菌药物处方率记录列表
 * @returns Ⅰ类切口预防使用率百分比
 */
export function computeTypeIPreventiveRateV13(records: AntibioticRxRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.typeITotalIncisions, 0);
  const preventive = records.reduce((acc, r) => acc + r.typeIPreventiveUse, 0);
  if (total === 0) return 0;
  return Math.round((preventive / total) * 100);
}
