/**
 * 健澜科技 jlmedaios - 隔离管理（细节）V13 纯函数（M423-B，detail 避让旧版 isolationMgmtV13（M393-B））
 *
 * computeIsolationMeasuresImplementationRateV13 / computeIsolationSignCorrectRateV13 / computeIsolationOrderComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 隔离管理（细节）记录 */
export interface IsolationDetailRecordV13 {
  implemented: number;
  shouldIsolate: number;
  signCorrect: number;
  isolationTotal: number;
  orderCompliant: number;
  isolationOrderTotal: number;
}

/**
 * 隔离措施落实率（纯函数）：落实隔离措施患者数/应隔离患者总数×100，保留 2 位小数。
 *
 * @param records 隔离管理（细节）记录列表
 * @returns 隔离措施落实率百分比
 */
export function computeIsolationMeasuresImplementationRateV13(records: IsolationDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldIsolate, 0);
  if (total === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.implemented, 0);
  return Math.round((implemented / total) * 10000) / 100;
}

/**
 * 隔离标识正确率（纯函数）：正确标识数/隔离患者总数×100，保留 2 位小数。
 *
 * @param records 隔离管理（细节）记录列表
 * @returns 隔离标识正确率百分比
 */
export function computeIsolationSignCorrectRateV13(records: IsolationDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.isolationTotal, 0);
  if (total === 0) return 0;
  const signCorrect = records.reduce((acc, r) => acc + r.signCorrect, 0);
  return Math.round((signCorrect / total) * 10000) / 100;
}

/**
 * 隔离医嘱规范率（纯函数）：规范医嘱数/隔离医嘱总数×100，保留 2 位小数。
 *
 * @param records 隔离管理（细节）记录列表
 * @returns 隔离医嘱规范率百分比
 */
export function computeIsolationOrderComplianceRateV13(records: IsolationDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.isolationOrderTotal, 0);
  if (total === 0) return 0;
  const order = records.reduce((acc, r) => acc + r.orderCompliant, 0);
  return Math.round((order / total) * 10000) / 100;
}
