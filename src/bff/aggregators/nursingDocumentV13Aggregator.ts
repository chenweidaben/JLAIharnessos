/**
 * 健澜科技 jlmedaios - 护理文书管理 V13 纯函数（M358-D，M358 收官）
 *
 * computeNursingDocumentPassRateV13 / computeNursingRecordTimelyRateV13 / computeOrderExecutionAccuracyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理文书管理记录 */
export interface NursingDocumentRecordV13 {
  documentPassed: number;
  documentSampled: number;
  recordTimely: number;
  recordCount: number;
  orderAccurate: number;
  orderExecuted: number;
}

/**
 * 护理文书合格率（纯函数）：合格数/抽查数×100，保留 2 位小数。
 *
 * @param records 护理文书管理记录列表
 * @returns 护理文书合格率百分比
 */
export function computeNursingDocumentPassRateV13(records: NursingDocumentRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.documentPassed, 0);
  const sampled = records.reduce((acc, r) => acc + r.documentSampled, 0);
  if (sampled === 0) return 0;
  return Math.round((passed / sampled) * 10000) / 100;
}

/**
 * 护理记录及时率（纯函数）：及时数/记录数×100，保留 2 位小数。
 *
 * @param records 护理文书管理记录列表
 * @returns 护理记录及时率百分比
 */
export function computeNursingRecordTimelyRateV13(records: NursingDocumentRecordV13[]): number {
  const timely = records.reduce((acc, r) => acc + r.recordTimely, 0);
  const count = records.reduce((acc, r) => acc + r.recordCount, 0);
  if (count === 0) return 0;
  return Math.round((timely / count) * 10000) / 100;
}

/**
 * 医嘱执行准确率（纯函数）：准确数/执行数×100，保留 2 位小数。
 *
 * @param records 护理文书管理记录列表
 * @returns 医嘱执行准确率百分比
 */
export function computeOrderExecutionAccuracyRateV13(records: NursingDocumentRecordV13[]): number {
  const accurate = records.reduce((acc, r) => acc + r.orderAccurate, 0);
  const executed = records.reduce((acc, r) => acc + r.orderExecuted, 0);
  if (executed === 0) return 0;
  return Math.round((accurate / executed) * 10000) / 100;
}
