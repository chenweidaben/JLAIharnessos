/**
 * 健澜科技 jlmedaios - 患者安全管理 V13 纯函数（M418-D，M418 收官）
 *
 * computePatientIdentificationCorrectRateV13 / computeMedicationErrorOccurrenceRateV13 / computeFallBedInjuryOccurrenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者安全管理记录 */
export interface PatientSafetyMgmtRecordV13 {
  correct: number;
  identifyTotal: number;
  medicationError: number;
  medicationTotal: number;
  fallBedInjury: number;
  inpatientCaseTotal: number;
}

/**
 * 患者身份识别正确率（纯函数）：正确识别次数/识别总次数×100，保留 2 位小数。
 *
 * @param records 患者安全管理记录列表
 * @returns 患者身份识别正确率百分比
 */
export function computePatientIdentificationCorrectRateV13(records: PatientSafetyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.identifyTotal, 0);
  if (total === 0) return 0;
  const correct = records.reduce((acc, r) => acc + r.correct, 0);
  return Math.round((correct / total) * 10000) / 100;
}

/**
 * 用药错误发生率（纯函数，反向指标，值越低越好）：用药错误例数/用药总例数×100，保留 2 位小数。
 *
 * @param records 患者安全管理记录列表
 * @returns 用药错误发生率百分比
 */
export function computeMedicationErrorOccurrenceRateV13(records: PatientSafetyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.medicationTotal, 0);
  if (total === 0) return 0;
  const medicationError = records.reduce((acc, r) => acc + r.medicationError, 0);
  return Math.round((medicationError / total) * 10000) / 100;
}

/**
 * 跌倒坠床发生率（纯函数，反向指标，值越低越好）：跌倒坠床例数/住院总例数×100，保留 2 位小数。
 *
 * @param records 患者安全管理记录列表
 * @returns 跌倒坠床发生率百分比
 */
export function computeFallBedInjuryOccurrenceRateV13(records: PatientSafetyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientCaseTotal, 0);
  if (total === 0) return 0;
  const fallBedInjury = records.reduce((acc, r) => acc + r.fallBedInjury, 0);
  return Math.round((fallBedInjury / total) * 10000) / 100;
}
