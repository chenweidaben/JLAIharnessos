/**
 * 健澜科技 jlmedaios - 档案管理 V13 纯函数（M450-C，宣传与党建管理组）
 *
 * computeArchiveTimelyFilingRateV13 / computeArchiveIntegrityRateV13 / computeArchiveDigitizationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 档案管理记录 */
export interface ArchiveMgmtRecordV13 {
  timely: number;
  shouldFiling: number;
  complete: number;
  totalArchive: number;
  digitized: number;
}

/**
 * 档案归档及时率（纯函数）：及时归档档案数/应归档档案总数×100，保留 2 位小数。
 *
 * @param records 档案管理记录列表
 * @returns 档案归档及时率百分比
 */
export function computeArchiveTimelyFilingRateV13(records: ArchiveMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldFiling, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 档案完整率（纯函数）：完整档案数/档案总数×100，保留 2 位小数。
 *
 * @param records 档案管理记录列表
 * @returns 档案完整率百分比
 */
export function computeArchiveIntegrityRateV13(records: ArchiveMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalArchive, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 档案数字化率（纯函数）：已数字化档案数/档案总数×100，保留 2 位小数。
 *
 * @param records 档案管理记录列表
 * @returns 档案数字化率百分比
 */
export function computeArchiveDigitizationRateV13(records: ArchiveMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalArchive, 0);
  if (total === 0) return 0;
  const digitized = records.reduce((acc, r) => acc + r.digitized, 0);
  return Math.round((digitized / total) * 10000) / 100;
}
