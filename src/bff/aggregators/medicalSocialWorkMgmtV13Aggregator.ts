/**
 * 健澜科技 jlmedaios - 医务社工管理 V13 纯函数（M420-D，M420 收官）
 *
 * computeSocialWorkServiceVisitsV13 / computeHardshipPatientAidRateV13 / computeDoctorPatientCommunicationCoordinationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医务社工管理记录 */
export interface MedicalSocialWorkMgmtRecordV13 {
  serviceVisits: number;
  hardshipAided: number;
  hardshipTotal: number;
  coordinationSuccess: number;
  coordinationTotal: number;
}

/**
 * 社工服务人次（纯函数）：累计服务人次求和，返回整数。
 *
 * @param records 医务社工管理记录列表
 * @returns 社工服务人次（整数）
 */
export function computeSocialWorkServiceVisitsV13(records: MedicalSocialWorkMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.serviceVisits, 0);
}

/**
 * 困难患者救助率（纯函数）：救助患者数/困难患者总数×100，保留 2 位小数。
 *
 * @param records 医务社工管理记录列表
 * @returns 困难患者救助率百分比
 */
export function computeHardshipPatientAidRateV13(records: MedicalSocialWorkMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.hardshipTotal, 0);
  if (total === 0) return 0;
  const hardshipAided = records.reduce((acc, r) => acc + r.hardshipAided, 0);
  return Math.round((hardshipAided / total) * 10000) / 100;
}

/**
 * 医患沟通协调成功率（纯函数）：成功协调次数/协调总次数×100，保留 2 位小数。
 *
 * @param records 医务社工管理记录列表
 * @returns 医患沟通协调成功率百分比
 */
export function computeDoctorPatientCommunicationCoordinationRateV13(records: MedicalSocialWorkMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.coordinationTotal, 0);
  if (total === 0) return 0;
  const coordinationSuccess = records.reduce((acc, r) => acc + r.coordinationSuccess, 0);
  return Math.round((coordinationSuccess / total) * 10000) / 100;
}
