/**
 * 健澜科技 jlmedaios - 护理文书质量 V13 纯函数（M405-A）
 *
 * computeNursingRecordPassRateV13 / computeTemperatureChartPassRateV13 / computeOrderExecutionSheetPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理文书质量记录 */
export interface NursingRecordQualityRecordV13 {
  recordPass: number;
  recordTotal: number;
  tempPass: number;
  tempTotal: number;
  orderPass: number;
  orderTotal: number;
}

/**
 * 护理记录合格率（纯函数）：合格份数/检查总份数×100，保留 2 位小数。
 *
 * @param records 护理文书质量记录列表
 * @returns 护理记录合格率百分比
 */
export function computeNursingRecordPassRateV13(records: NursingRecordQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recordTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.recordPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 体温单合格率（纯函数）：合格份数/检查总份数×100，保留 2 位小数。
 *
 * @param records 护理文书质量记录列表
 * @returns 体温单合格率百分比
 */
export function computeTemperatureChartPassRateV13(records: NursingRecordQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.tempTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.tempPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 医嘱执行单合格率（纯函数）：合格份数/检查总份数×100，保留 2 位小数。
 *
 * @param records 护理文书质量记录列表
 * @returns 医嘱执行单合格率百分比
 */
export function computeOrderExecutionSheetPassRateV13(records: NursingRecordQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.orderTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.orderPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}
