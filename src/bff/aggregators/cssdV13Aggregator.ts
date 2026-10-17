/**
 * 健澜科技 jlmedaios - 消毒供应 V13 纯函数（M351-A）
 *
 * computeSterilizedPackageCountV13 / computeWetPackageRateV13 / computeBioMonitorPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 消毒供应记录 */
export interface CssdRecordV13 {
  sterilizedPackageCount: number;
  wetPackageCount: number;
  bioMonitorCount: number;
  bioMonitorPassedCount: number;
}

/**
 * 灭菌包数（纯函数）：求和。
 *
 * @param records 消毒供应记录列表
 * @returns 灭菌包数
 */
export function computeSterilizedPackageCountV13(records: CssdRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.sterilizedPackageCount, 0);
}

/**
 * 湿包率（纯函数）：湿包数/灭菌包数×100，保留 2 位小数。
 *
 * @param records 消毒供应记录列表
 * @returns 湿包率百分比
 */
export function computeWetPackageRateV13(records: CssdRecordV13[]): number {
  const wet = records.reduce((acc, r) => acc + r.wetPackageCount, 0);
  const sterilized = records.reduce((acc, r) => acc + r.sterilizedPackageCount, 0);
  if (sterilized === 0) return 0;
  return Math.round((wet / sterilized) * 10000) / 100;
}

/**
 * 生物监测合格率（纯函数）：合格数/监测数×100，保留 2 位小数。
 *
 * @param records 消毒供应记录列表
 * @returns 生物监测合格率百分比
 */
export function computeBioMonitorPassRateV13(records: CssdRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.bioMonitorPassedCount, 0);
  const monitored = records.reduce((acc, r) => acc + r.bioMonitorCount, 0);
  if (monitored === 0) return 0;
  return Math.round((passed / monitored) * 10000) / 100;
}
