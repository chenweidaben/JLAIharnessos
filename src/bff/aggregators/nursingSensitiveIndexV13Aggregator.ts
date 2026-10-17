/**
 * 健澜科技 jlmedaios - 护理敏感指标 V13 纯函数（M376-C）
 *
 * computePressureUlcerRateV13 / computeFallRateV13 / computeUnplannedExtubationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理敏感指标记录 */
export interface NursingSensitiveIndexRecordV13 {
  inpatientCount: number;
  pressureUlcerCount: number;
  fallCount: number;
  intubationCount: number;
  unplannedExtubationCount: number;
}

/**
 * 压疮发生率（纯函数）：发生数/住院人数×100，保留 2 位小数。
 *
 * @param records 护理敏感指标记录列表
 * @returns 压疮发生率百分比
 */
export function computePressureUlcerRateV13(records: NursingSensitiveIndexRecordV13[]): number {
  const inpatient = records.reduce((acc, r) => acc + r.inpatientCount, 0);
  if (inpatient === 0) return 0;
  const pressureUlcer = records.reduce((acc, r) => acc + r.pressureUlcerCount, 0);
  return Math.round((pressureUlcer / inpatient) * 10000) / 100;
}

/**
 * 跌倒发生率（纯函数）：发生数/住院人数×100，保留 2 位小数。
 *
 * @param records 护理敏感指标记录列表
 * @returns 跌倒发生率百分比
 */
export function computeFallRateV13(records: NursingSensitiveIndexRecordV13[]): number {
  const inpatient = records.reduce((acc, r) => acc + r.inpatientCount, 0);
  if (inpatient === 0) return 0;
  const fall = records.reduce((acc, r) => acc + r.fallCount, 0);
  return Math.round((fall / inpatient) * 10000) / 100;
}

/**
 * 非计划拔管率（纯函数）：拔管数/插管数×100，保留 2 位小数。
 *
 * @param records 护理敏感指标记录列表
 * @returns 非计划拔管率百分比
 */
export function computeUnplannedExtubationRateV13(records: NursingSensitiveIndexRecordV13[]): number {
  const intubation = records.reduce((acc, r) => acc + r.intubationCount, 0);
  if (intubation === 0) return 0;
  const extubation = records.reduce((acc, r) => acc + r.unplannedExtubationCount, 0);
  return Math.round((extubation / intubation) * 10000) / 100;
}
