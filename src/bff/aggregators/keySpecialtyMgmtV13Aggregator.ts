/**
 * 健澜科技 jlmedaios - 重点专科管理 V13 纯函数（M403-A）
 *
 * computeNationalKeySpecialtyCountV13 / computeProvincialKeySpecialtyCountV13 / computeSpecialtyRadiationHospitalCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 重点专科管理记录 */
export interface KeySpecialtyMgmtRecordV13 {
  nationalCount: number;
  provincialCount: number;
  radiationHospitals: number;
}

/**
 * 国家级重点专科数（纯函数）：求和。
 *
 * @param records 重点专科管理记录列表
 * @returns 国家级重点专科数
 */
export function computeNationalKeySpecialtyCountV13(records: KeySpecialtyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nationalCount, 0);
}

/**
 * 省级重点专科数（纯函数）：求和。
 *
 * @param records 重点专科管理记录列表
 * @returns 省级重点专科数
 */
export function computeProvincialKeySpecialtyCountV13(records: KeySpecialtyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.provincialCount, 0);
}

/**
 * 专科辐射带动医院数（纯函数）：求和。
 *
 * @param records 重点专科管理记录列表
 * @returns 专科辐射带动医院数
 */
export function computeSpecialtyRadiationHospitalCountV13(records: KeySpecialtyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.radiationHospitals, 0);
}
