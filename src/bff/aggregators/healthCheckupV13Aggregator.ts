/**
 * 健澜科技 jlmedaios - 健康体检 V13 纯函数（M399-D，M399 收官）
 *
 * computeHealthCheckupCountV13 / computeHealthCheckupPackageCountV13 / computeHealthCheckupAbnormalFollowupRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健康体检记录 */
export interface HealthCheckupRecordV13 {
  checkupCount: number;
  packageCount: number;
  followedAbnormalCount: number;
  abnormalCount: number;
}

/**
 * 体检人数（纯函数）：求和。
 *
 * @param records 健康体检记录列表
 * @returns 体检人数
 */
export function computeHealthCheckupCountV13(records: HealthCheckupRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.checkupCount, 0);
}

/**
 * 体检套餐数（纯函数）：求和。
 *
 * @param records 健康体检记录列表
 * @returns 体检套餐数
 */
export function computeHealthCheckupPackageCountV13(records: HealthCheckupRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.packageCount, 0);
}

/**
 * 体检异常随访率（纯函数）：已随访异常人数/异常体检人数×100，保留 2 位小数。
 *
 * @param records 健康体检记录列表
 * @returns 体检异常随访率百分比
 */
export function computeHealthCheckupAbnormalFollowupRateV13(records: HealthCheckupRecordV13[]): number {
  const abnormal = records.reduce((acc, r) => acc + r.abnormalCount, 0);
  if (abnormal === 0) return 0;
  const followed = records.reduce((acc, r) => acc + r.followedAbnormalCount, 0);
  return Math.round((followed / abnormal) * 10000) / 100;
}
