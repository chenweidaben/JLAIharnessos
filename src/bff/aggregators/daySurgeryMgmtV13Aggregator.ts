/**
 * 健澜科技 jlmedaios - 日间手术管理 V13 纯函数（M458-A，日间手术与门诊操作管理组）
 *
 * computeDaySurgeryProportionRateV13 / computeDaySurgeryDischargeFollowupRateV13 / computeDaySurgeryUnplannedReadmissionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 日间手术管理记录 */
export interface DaySurgeryMgmtRecordV13 {
  day: number;
  totalElective: number;
  followedUp: number;
  totalDischarged: number;
  readmission: number;
}

/**
 * 日间手术占择期手术比例（纯函数）：日间手术台次/择期手术总台次×100，保留 2 位小数。
 *
 * @param records 日间手术管理记录列表
 * @returns 日间手术占择期手术比例百分比
 */
export function computeDaySurgeryProportionRateV13(records: DaySurgeryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalElective, 0);
  if (total === 0) return 0;
  const day = records.reduce((acc, r) => acc + r.day, 0);
  return Math.round((day / total) * 10000) / 100;
}

/**
 * 日间手术出院随访率（纯函数）：已随访日间手术患者数/日间手术出院患者总数×100，保留 2 位小数。
 *
 * @param records 日间手术管理记录列表
 * @returns 日间手术出院随访率百分比
 */
export function computeDaySurgeryDischargeFollowupRateV13(records: DaySurgeryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDischarged, 0);
  if (total === 0) return 0;
  const followedUp = records.reduce((acc, r) => acc + r.followedUp, 0);
  return Math.round((followedUp / total) * 10000) / 100;
}

/**
 * 日间手术非计划再入院率（纯函数，反向指标越低越好）：非计划再入院患者数/日间手术出院患者总数×100，保留 2 位小数。
 *
 * @param records 日间手术管理记录列表
 * @returns 日间手术非计划再入院率百分比
 */
export function computeDaySurgeryUnplannedReadmissionRateV13(records: DaySurgeryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDischarged, 0);
  if (total === 0) return 0;
  const readmission = records.reduce((acc, r) => acc + r.readmission, 0);
  return Math.round((readmission / total) * 10000) / 100;
}
