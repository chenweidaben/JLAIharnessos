/**
 * 健澜科技 jlmedaios - 抗菌药物使用质量管理 V13 纯函数（M440-B，药事管理与药学服务组）
 *
 * computeAntibioticUseDddsV13 / computeAntibioticUseOutpatientRateV13 / computeAntibioticUseInpatientRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抗菌药物使用质量管理记录 */
export interface AntibioticUseQualityRecordV13 {
  dddsTotal: number;
  totalBedDays: number;
  outpatientAntibioticPrescription: number;
  outpatientTotalPrescription: number;
  inpatientAntibioticPatient: number;
  inpatientTotalPatient: number;
}

/**
 * 抗菌药物使用强度 DDDs（纯函数，强度指标）：DDDs 总数/同期出院患者占用总床日数×100，保留 2 位小数，单位：DDDs/100 人天。
 *
 * @param records 抗菌药物使用质量管理记录列表
 * @returns 抗菌药物使用强度（DDDs/100 人天）
 */
export function computeAntibioticUseDddsV13(records: AntibioticUseQualityRecordV13[]): number {
  const totalBedDaysSum = records.reduce((acc, r) => acc + r.totalBedDays, 0);
  if (totalBedDaysSum === 0) return 0;
  const dddsSum = records.reduce((acc, r) => acc + r.dddsTotal, 0);
  return Math.round((dddsSum / totalBedDaysSum) * 10000) / 100;
}

/**
 * 门诊抗菌药物使用率（纯函数，反向指标，越低越好）：门诊使用抗菌药物处方数/门诊处方总数×100，保留 2 位小数。
 *
 * @param records 抗菌药物使用质量管理记录列表
 * @returns 门诊抗菌药物使用率百分比
 */
export function computeAntibioticUseOutpatientRateV13(records: AntibioticUseQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientTotalPrescription, 0);
  if (total === 0) return 0;
  const antibiotic = records.reduce((acc, r) => acc + r.outpatientAntibioticPrescription, 0);
  return Math.round((antibiotic / total) * 10000) / 100;
}

/**
 * 住院抗菌药物使用率（纯函数，反向指标，越低越好）：住院使用抗菌药物患者数/住院患者总数×100，保留 2 位小数。
 *
 * @param records 抗菌药物使用质量管理记录列表
 * @returns 住院抗菌药物使用率百分比
 */
export function computeAntibioticUseInpatientRateV13(records: AntibioticUseQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotalPatient, 0);
  if (total === 0) return 0;
  const antibiotic = records.reduce((acc, r) => acc + r.inpatientAntibioticPatient, 0);
  return Math.round((antibiotic / total) * 10000) / 100;
}
