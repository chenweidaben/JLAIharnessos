/**
 * 健澜科技 jlmedaios - 安宁疗护 V13 纯函数（M350-D，M350 收官）
 *
 * computeHospiceBedDaysV13 / computePainAssessmentRateV13 / computeFamilySatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安宁疗护记录 */
export interface PalliativeCareRecordV13 {
  hospiceBedDays: number;
  painAssessedCount: number;
  palliativePatientsCount: number;
  familySatisfaction: number;
}

/**
 * 安宁疗护床日数（纯函数）：求和。
 *
 * @param records 安宁疗护记录列表
 * @returns 安宁疗护床日数
 */
export function computeHospiceBedDaysV13(records: PalliativeCareRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.hospiceBedDays, 0);
}

/**
 * 疼痛评估率（纯函数）：评估数/安宁患者数×100，保留 2 位小数。
 *
 * @param records 安宁疗护记录列表
 * @returns 疼痛评估率百分比
 */
export function computePainAssessmentRateV13(records: PalliativeCareRecordV13[]): number {
  const assessed = records.reduce((acc, r) => acc + r.painAssessedCount, 0);
  const patients = records.reduce((acc, r) => acc + r.palliativePatientsCount, 0);
  if (patients === 0) return 0;
  return Math.round((assessed / patients) * 10000) / 100;
}

/**
 * 家属满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 安宁疗护记录列表
 * @returns 家属满意度均值
 */
export function computeFamilySatisfactionV13(records: PalliativeCareRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.familySatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
