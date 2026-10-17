/**
 * 健澜科技 jlmedaios - 慢病管理 V13 纯函数（M337-D）
 *
 * computeHypertensionManagementRateV13 / computeDiabetesManagementRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 慢病管理记录 */
export interface ChronicDiseaseRecordV13 {
  hypertensionPatients: number;
  hypertensionManaged: number;
  diabetesPatients: number;
  diabetesManaged: number;
}

/**
 * 高血压规范管理率（纯函数）：规范管理数/高血压患者数×100。
 *
 * @param records 慢病管理记录列表
 * @returns 高血压规范管理率百分比
 */
export function computeHypertensionManagementRateV13(records: ChronicDiseaseRecordV13[]): number {
  const patients = records.reduce((acc, r) => acc + r.hypertensionPatients, 0);
  const managed = records.reduce((acc, r) => acc + r.hypertensionManaged, 0);
  if (patients === 0) return 0;
  return Math.round((managed / patients) * 100);
}

/**
 * 糖尿病规范管理率（纯函数）：规范管理数/糖尿病患者数×100。
 *
 * @param records 慢病管理记录列表
 * @returns 糖尿病规范管理率百分比
 */
export function computeDiabetesManagementRateV13(records: ChronicDiseaseRecordV13[]): number {
  const patients = records.reduce((acc, r) => acc + r.diabetesPatients, 0);
  const managed = records.reduce((acc, r) => acc + r.diabetesManaged, 0);
  if (patients === 0) return 0;
  return Math.round((managed / patients) * 100);
}
