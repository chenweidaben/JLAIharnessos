/**
 * 健澜科技 jlmedaios - 麻醉质量 V13 纯函数（M371-D，M371 收官）
 *
 * computeAnesthesiaMortalityRateV13 / computeAnesthesiaComplicationRateV13 / computePostoperativeAnalgesiaRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 麻醉质量记录 */
export interface AnesthesiaQualityRecordV13 {
  anesthesiaCount: number;
  anesthesiaMortalityCount: number;
  anesthesiaComplicationCount: number;
  surgeryCount: number;
  postoperativeAnalgesiaCount: number;
}

/**
 * 麻醉死亡率（纯函数）：死亡数/麻醉数×100，保留 2 位小数。
 *
 * @param records 麻醉质量记录列表
 * @returns 麻醉死亡率百分比
 */
export function computeAnesthesiaMortalityRateV13(records: AnesthesiaQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.anesthesiaCount, 0);
  if (total === 0) return 0;
  const mortality = records.reduce((acc, r) => acc + r.anesthesiaMortalityCount, 0);
  return Math.round((mortality / total) * 10000) / 100;
}

/**
 * 麻醉并发症率（纯函数）：并发症数/麻醉数×100，保留 2 位小数。
 *
 * @param records 麻醉质量记录列表
 * @returns 麻醉并发症率百分比
 */
export function computeAnesthesiaComplicationRateV13(records: AnesthesiaQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.anesthesiaCount, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.anesthesiaComplicationCount, 0);
  return Math.round((complication / total) * 10000) / 100;
}

/**
 * 术后镇痛率（纯函数）：镇痛数/手术数×100，保留 2 位小数。
 *
 * @param records 麻醉质量记录列表
 * @returns 术后镇痛率百分比
 */
export function computePostoperativeAnalgesiaRateV13(records: AnesthesiaQualityRecordV13[]): number {
  const surgery = records.reduce((acc, r) => acc + r.surgeryCount, 0);
  if (surgery === 0) return 0;
  const analgesia = records.reduce((acc, r) => acc + r.postoperativeAnalgesiaCount, 0);
  return Math.round((analgesia / surgery) * 10000) / 100;
}
