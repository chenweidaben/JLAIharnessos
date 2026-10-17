/**
 * 健澜科技 jlmedaios - 病案归档管理 V13 纯函数（M420-A，archive 维度避让旧版 medicalRecordMgmtV13/medicalRecordDetailV13）
 *
 * computeMedicalRecordArchiveTimelyRateV13 / computeMedicalRecordStockTurnoverRateV13 / computeMedicalRecordBorrowReturnRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病案归档管理记录 */
export interface MedicalRecordArchiveMgmtRecordV13 {
  archiveTimely: number;
  archiveShould: number;
  stockBorrowReturn: number;
  stockTotal: number;
  borrowReturnOnTime: number;
  borrowTotal: number;
}

/**
 * 病案归档及时率（纯函数）：及时归档数/应归档总数×100，保留 2 位小数。
 *
 * @param records 病案归档管理记录列表
 * @returns 病案归档及时率百分比
 */
export function computeMedicalRecordArchiveTimelyRateV13(records: MedicalRecordArchiveMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.archiveShould, 0);
  if (total === 0) return 0;
  const archiveTimely = records.reduce((acc, r) => acc + r.archiveTimely, 0);
  return Math.round((archiveTimely / total) * 10000) / 100;
}

/**
 * 病案室库存周转率（纯函数）：借出归还数/库存总数×100，保留 2 位小数。
 *
 * @param records 病案归档管理记录列表
 * @returns 病案室库存周转率百分比
 */
export function computeMedicalRecordStockTurnoverRateV13(records: MedicalRecordArchiveMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.stockTotal, 0);
  if (total === 0) return 0;
  const stockBorrowReturn = records.reduce((acc, r) => acc + r.stockBorrowReturn, 0);
  return Math.round((stockBorrowReturn / total) * 10000) / 100;
}

/**
 * 病案借阅归还率（纯函数）：按时归还数/借阅总数×100，保留 2 位小数。
 *
 * @param records 病案归档管理记录列表
 * @returns 病案借阅归还率百分比
 */
export function computeMedicalRecordBorrowReturnRateV13(records: MedicalRecordArchiveMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.borrowTotal, 0);
  if (total === 0) return 0;
  const borrowReturnOnTime = records.reduce((acc, r) => acc + r.borrowReturnOnTime, 0);
  return Math.round((borrowReturnOnTime / total) * 10000) / 100;
}
