/**
 * 健澜科技 jlmedaios - 交接班管理 V13 纯函数（M387-B）
 *
 * computeHandoverExecutionRateV13 / computeCriticalPatientBedsideHandoverRateV13 / computeHandoverOmissionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 交接班管理记录 */
export interface HandoverMgmtRecordV13 {
  executedCount: number;
  shouldCount: number;
  bedsideCount: number;
  criticalPatientCount: number;
  omissionCount: number;
  handoverCount: number;
}

/**
 * 交接班执行率（纯函数）：已执行数/应执行数×100，保留 2 位小数。
 *
 * @param records 交接班管理记录列表
 * @returns 交接班执行率百分比
 */
export function computeHandoverExecutionRateV13(records: HandoverMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executedCount, 0);
  return Math.round((executed / should) * 10000) / 100;
}

/**
 * 危重患者床旁交接率（纯函数）：床旁交接数/危重患者数×100，保留 2 位小数。
 *
 * @param records 交接班管理记录列表
 * @returns 危重患者床旁交接率百分比
 */
export function computeCriticalPatientBedsideHandoverRateV13(records: HandoverMgmtRecordV13[]): number {
  const critical = records.reduce((acc, r) => acc + r.criticalPatientCount, 0);
  if (critical === 0) return 0;
  const bedside = records.reduce((acc, r) => acc + r.bedsideCount, 0);
  return Math.round((bedside / critical) * 10000) / 100;
}

/**
 * 交接班遗漏率（纯函数）：遗漏次数/交接次数×100，保留 2 位小数。
 *
 * @param records 交接班管理记录列表
 * @returns 交接班遗漏率百分比
 */
export function computeHandoverOmissionRateV13(records: HandoverMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.handoverCount, 0);
  if (total === 0) return 0;
  const omission = records.reduce((acc, r) => acc + r.omissionCount, 0);
  return Math.round((omission / total) * 10000) / 100;
}
