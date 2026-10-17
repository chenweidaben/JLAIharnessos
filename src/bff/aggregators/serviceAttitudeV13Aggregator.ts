/**
 * 健澜科技 jlmedaios - 服务态度 V13 纯函数（M365-C）
 *
 * computeMedicalEthicsScoreV13 / computeServiceAttitudeScoreV13 / computeDoctorPatientCommunicationScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 服务态度记录 */
export interface ServiceAttitudeRecordV13 {
  medicalEthicsScore: number;
  serviceAttitudeScore: number;
  doctorPatientCommunicationScore: number;
}

/**
 * 医德医风评分（纯函数）：均值，保留 2 位小数。
 *
 * @param records 服务态度记录列表
 * @returns 医德医风评分均值
 */
export function computeMedicalEthicsScoreV13(records: ServiceAttitudeRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.medicalEthicsScore, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 服务态度评分（纯函数）：均值，保留 2 位小数。
 *
 * @param records 服务态度记录列表
 * @returns 服务态度评分均值
 */
export function computeServiceAttitudeScoreV13(records: ServiceAttitudeRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.serviceAttitudeScore, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 医患沟通评分（纯函数）：均值，保留 2 位小数。
 *
 * @param records 服务态度记录列表
 * @returns 医患沟通评分均值
 */
export function computeDoctorPatientCommunicationScoreV13(records: ServiceAttitudeRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.doctorPatientCommunicationScore, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
