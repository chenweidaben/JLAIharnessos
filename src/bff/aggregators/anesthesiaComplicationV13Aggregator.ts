/**
 * 健澜科技 jlmedaios - 麻醉相关并发症 V13 纯函数（M339-B）
 *
 * computeTotalComplicationRateV13 / computeSevereComplicationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 麻醉相关并发症记录 */
export interface AnesthesiaComplicationRecordV13 {
  totalAnesthesia: number;
  complicationCount: number;
  severeComplicationCount: number;
}

/**
 * 总发生率（纯函数）：并发症数/麻醉总数×100，保留 1 位小数。
 *
 * @param records 麻醉相关并发症记录列表
 * @returns 总发生率百分比
 */
export function computeTotalComplicationRateV13(records: AnesthesiaComplicationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAnesthesia, 0);
  const complications = records.reduce((acc, r) => acc + r.complicationCount, 0);
  if (total === 0) return 0;
  return Math.round((complications / total) * 1000) / 10;
}

/**
 * 严重并发症率（纯函数）：严重并发症数/麻醉总数×100，保留 1 位小数。
 *
 * @param records 麻醉相关并发症记录列表
 * @returns 严重并发症率百分比
 */
export function computeSevereComplicationRateV13(records: AnesthesiaComplicationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAnesthesia, 0);
  const severe = records.reduce((acc, r) => acc + r.severeComplicationCount, 0);
  if (total === 0) return 0;
  return Math.round((severe / total) * 1000) / 10;
}
