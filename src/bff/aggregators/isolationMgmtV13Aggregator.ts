/**
 * 健澜科技 jlmedaios - 隔离管理 V13 纯函数（M393-B）
 *
 * computeIsolationMeasureImplementationRateV13 / computeIsolationLabelCorrectRateV13 / computeIsolationPatientDisposalRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 隔离管理记录 */
export interface IsolationMgmtRecordV13 {
  implementedCount: number;
  shouldCount: number;
  correctCount: number;
  checkTotalCount: number;
  disposedCount: number;
  shouldDisposeCount: number;
}

/**
 * 隔离措施落实率（纯函数）：已落实数/应落实数×100，保留 2 位小数。
 *
 * @param records 隔离管理记录列表
 * @returns 隔离措施落实率百分比
 */
export function computeIsolationMeasureImplementationRateV13(records: IsolationMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.implementedCount, 0);
  return Math.round((implemented / should) * 10000) / 100;
}

/**
 * 隔离标识正确率（纯函数）：正确数/检查总数×100，保留 2 位小数。
 *
 * @param records 隔离管理记录列表
 * @returns 隔离标识正确率百分比
 */
export function computeIsolationLabelCorrectRateV13(records: IsolationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.checkTotalCount, 0);
  if (total === 0) return 0;
  const correct = records.reduce((acc, r) => acc + r.correctCount, 0);
  return Math.round((correct / total) * 10000) / 100;
}

/**
 * 隔离患者处置率（纯函数）：已处置数/应处置数×100，保留 2 位小数。
 *
 * @param records 隔离管理记录列表
 * @returns 隔离患者处置率百分比
 */
export function computeIsolationPatientDisposalRateV13(records: IsolationMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldDisposeCount, 0);
  if (should === 0) return 0;
  const disposed = records.reduce((acc, r) => acc + r.disposedCount, 0);
  return Math.round((disposed / should) * 10000) / 100;
}
