/**
 * 健澜科技 jlmedaios - 医疗废物 V13 纯函数（M351-D，M351 收官）
 *
 * computeSortCollectionRateV13 / computeHandoverRegisterRateV13 / computeStorageTimeoutRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗废物记录 */
export interface MedicalWasteRecordV13 {
  sortedCount: number;
  totalCount: number;
  registeredCount: number;
  handedOverCount: number;
  timeoutCount: number;
  storedCount: number;
}

/**
 * 分类收集率（纯函数）：分类数/总数×100，保留 2 位小数。
 *
 * @param records 医疗废物记录列表
 * @returns 分类收集率百分比
 */
export function computeSortCollectionRateV13(records: MedicalWasteRecordV13[]): number {
  const sorted = records.reduce((acc, r) => acc + r.sortedCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  return Math.round((sorted / total) * 10000) / 100;
}

/**
 * 交接登记率（纯函数）：登记数/交接数×100，保留 2 位小数。
 *
 * @param records 医疗废物记录列表
 * @returns 交接登记率百分比
 */
export function computeHandoverRegisterRateV13(records: MedicalWasteRecordV13[]): number {
  const registered = records.reduce((acc, r) => acc + r.registeredCount, 0);
  const handedOver = records.reduce((acc, r) => acc + r.handedOverCount, 0);
  if (handedOver === 0) return 0;
  return Math.round((registered / handedOver) * 10000) / 100;
}

/**
 * 暂存超时率（纯函数）：超时数/暂存数×100，保留 2 位小数。
 *
 * @param records 医疗废物记录列表
 * @returns 暂存超时率百分比
 */
export function computeStorageTimeoutRateV13(records: MedicalWasteRecordV13[]): number {
  const timeout = records.reduce((acc, r) => acc + r.timeoutCount, 0);
  const stored = records.reduce((acc, r) => acc + r.storedCount, 0);
  if (stored === 0) return 0;
  return Math.round((timeout / stored) * 10000) / 100;
}
