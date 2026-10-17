/**
 * 健澜科技 jlmedaios - 安全核查管理 V13 纯函数（M426-C，换名避让旧版 surgeryVolumeV13（M339））
 *
 * computeSurgerySafetyCheckRateV13 / computeSurgerySiteMarkRateV13 / computeSurgeryPauseExecutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安全核查管理记录 */
export interface SafetyCheckMgmtRecordV13 {
  safetyCheckDone: number;
  siteMarked: number;
  pauseExecuted: number;
  surgeryTotal: number;
}

/**
 * 手术安全核查率（纯函数）：完成安全核查手术数/手术总数×100，保留 2 位小数。
 *
 * @param records 安全核查管理记录列表
 * @returns 手术安全核查率百分比
 */
export function computeSurgerySafetyCheckRateV13(records: SafetyCheckMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryTotal, 0);
  if (total === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.safetyCheckDone, 0);
  return Math.round((done / total) * 10000) / 100;
}

/**
 * 手术部位标识率（纯函数）：正确标识手术数/手术总数×100，保留 2 位小数。
 *
 * @param records 安全核查管理记录列表
 * @returns 手术部位标识率百分比
 */
export function computeSurgerySiteMarkRateV13(records: SafetyCheckMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryTotal, 0);
  if (total === 0) return 0;
  const marked = records.reduce((acc, r) => acc + r.siteMarked, 0);
  return Math.round((marked / total) * 10000) / 100;
}

/**
 * 手术暂停执行率（纯函数）：执行暂停手术数/手术总数×100，保留 2 位小数。
 *
 * @param records 安全核查管理记录列表
 * @returns 手术暂停执行率百分比
 */
export function computeSurgeryPauseExecutionRateV13(records: SafetyCheckMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryTotal, 0);
  if (total === 0) return 0;
  const paused = records.reduce((acc, r) => acc + r.pauseExecuted, 0);
  return Math.round((paused / total) * 10000) / 100;
}
