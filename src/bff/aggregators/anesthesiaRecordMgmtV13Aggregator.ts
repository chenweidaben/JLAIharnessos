/**
 * 健澜科技 jlmedaios - 麻醉记录管理 V13 纯函数（M426-B，换名避让旧版 anesthesiaComplicationV13（M339））
 *
 * computeAnesthesiaRecordCompleteRateV13 / computeAnesthesiaRecordTimelyRateV13 / computeAnesthesiaRecordPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 麻醉记录管理记录 */
export interface AnesthesiaRecordMgmtRecordV13 {
  completeAnes: number;
  timelyAnes: number;
  passAnes: number;
  anesTotal: number;
}

/**
 * 麻醉记录完整率（纯函数）：完整麻醉记录数/麻醉总例数×100，保留 2 位小数。
 *
 * @param records 麻醉记录管理记录列表
 * @returns 麻醉记录完整率百分比
 */
export function computeAnesthesiaRecordCompleteRateV13(records: AnesthesiaRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.anesTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.completeAnes, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 麻醉记录及时率（纯函数）：及时完成麻醉记录数/麻醉总例数×100，保留 2 位小数。
 *
 * @param records 麻醉记录管理记录列表
 * @returns 麻醉记录及时率百分比
 */
export function computeAnesthesiaRecordTimelyRateV13(records: AnesthesiaRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.anesTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyAnes, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 麻醉记录合格率（纯函数）：合格麻醉记录数/麻醉总例数×100，保留 2 位小数。
 *
 * @param records 麻醉记录管理记录列表
 * @returns 麻醉记录合格率百分比
 */
export function computeAnesthesiaRecordPassRateV13(records: AnesthesiaRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.anesTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.passAnes, 0);
  return Math.round((pass / total) * 10000) / 100;
}
