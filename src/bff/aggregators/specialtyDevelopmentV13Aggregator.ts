/**
 * 健澜科技 jlmedaios - 重点专科建设 V13 纯函数（M355-A）
 *
 * computeNationalSpecialtyCountV13 / computeProvincialSpecialtyCountV13 / computeMunicipalSpecialtyCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 重点专科建设记录 */
export interface SpecialtyDevelopmentRecordV13 {
  nationalSpecialtyCount: number;
  provincialSpecialtyCount: number;
  municipalSpecialtyCount: number;
}

/**
 * 国家级重点专科数（纯函数）：求和。
 *
 * @param records 重点专科建设记录列表
 * @returns 国家级重点专科数
 */
export function computeNationalSpecialtyCountV13(records: SpecialtyDevelopmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nationalSpecialtyCount, 0);
}

/**
 * 省级重点专科数（纯函数）：求和。
 *
 * @param records 重点专科建设记录列表
 * @returns 省级重点专科数
 */
export function computeProvincialSpecialtyCountV13(records: SpecialtyDevelopmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.provincialSpecialtyCount, 0);
}

/**
 * 市级重点专科数（纯函数）：求和。
 *
 * @param records 重点专科建设记录列表
 * @returns 市级重点专科数
 */
export function computeMunicipalSpecialtyCountV13(records: SpecialtyDevelopmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.municipalSpecialtyCount, 0);
}
