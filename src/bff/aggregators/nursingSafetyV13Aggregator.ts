/**
 * 健澜科技 jlmedaios - 护理安全 V13 纯函数（M369-B）
 *
 * computeNursingAdverseEventCountV13 / computePressureUlcerRateV13 / computeFallRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理安全记录 */
export interface NursingSafetyRecordV13 {
  adverseEventCount: number;
  inpatientCount: number;
  pressureUlcerCount: number;
  fallCount: number;
}

/**
 * 护理不良事件数（纯函数）：求和。
 *
 * @param records 护理安全记录列表
 * @returns 护理不良事件数
 */
export function computeNursingAdverseEventCountV13(records: NursingSafetyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.adverseEventCount, 0);
}

/**
 * 压疮发生率（纯函数）：发生数/住院人数×100，保留 2 位小数。
 *
 * @param records 护理安全记录列表
 * @returns 压疮发生率百分比
 */
export function computePressureUlcerRateV13(records: NursingSafetyRecordV13[]): number {
  const inpatient = records.reduce((acc, r) => acc + r.inpatientCount, 0);
  if (inpatient === 0) return 0;
  const pressureUlcer = records.reduce((acc, r) => acc + r.pressureUlcerCount, 0);
  return Math.round((pressureUlcer / inpatient) * 10000) / 100;
}

/**
 * 跌倒发生率（纯函数）：发生数/住院人数×100，保留 2 位小数。
 *
 * @param records 护理安全记录列表
 * @returns 跌倒发生率百分比
 */
export function computeFallRateV13(records: NursingSafetyRecordV13[]): number {
  const inpatient = records.reduce((acc, r) => acc + r.inpatientCount, 0);
  if (inpatient === 0) return 0;
  const fall = records.reduce((acc, r) => acc + r.fallCount, 0);
  return Math.round((fall / inpatient) * 10000) / 100;
}
