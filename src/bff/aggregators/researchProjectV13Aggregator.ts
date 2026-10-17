/**
 * 健澜科技 jlmedaios - 科研项目 V13 纯函数（M343-C）
 *
 * computeNationalCountV13 / computeProvincialCountV13 / computeMunicipalCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科研项目记录 */
export interface ResearchProjectRecordV13 {
  nationalCount: number;
  provincialCount: number;
  municipalCount: number;
}

/**
 * 新立项国家级数（纯函数）：求和。
 *
 * @param records 科研项目记录列表
 * @returns 新立项国家级数
 */
export function computeNationalCountV13(records: ResearchProjectRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nationalCount, 0);
}

/**
 * 新立项省部级数（纯函数）：求和。
 *
 * @param records 科研项目记录列表
 * @returns 新立项省部级数
 */
export function computeProvincialCountV13(records: ResearchProjectRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.provincialCount, 0);
}

/**
 * 新立项市厅级数（纯函数）：求和。
 *
 * @param records 科研项目记录列表
 * @returns 新立项市厅级数
 */
export function computeMunicipalCountV13(records: ResearchProjectRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.municipalCount, 0);
}
