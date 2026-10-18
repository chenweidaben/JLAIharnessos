/**
 * 健澜科技 jlmedaios - 门诊小手术管理 V13 纯函数（M458-B，日间手术与门诊操作管理组）
 *
 * computeOutpatientMinorSurgeryVolumeCountV13 / computeOutpatientMinorSurgeryWoundHealingRateV13 / computeOutpatientMinorSurgeryComplicationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊小手术管理记录 */
export interface OutpatientMinorSurgeryMgmtRecordV13 {
  minorSurgeryCount: number;
  healed: number;
  totalWound: number;
  complication: number;
  totalSurgery: number;
}

/**
 * 门诊小手术量（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.minorSurgeryCount, 0)，直接返回计数。
 *
 * @param records 门诊小手术管理记录列表
 * @returns 门诊小手术总数量（台）
 */
export function computeOutpatientMinorSurgeryVolumeCountV13(records: OutpatientMinorSurgeryMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.minorSurgeryCount, 0);
}

/**
 * 门诊手术伤口甲级愈合率（纯函数）：甲级愈合伤口数/门诊手术伤口总数×100，保留 2 位小数。
 *
 * @param records 门诊小手术管理记录列表
 * @returns 门诊手术伤口甲级愈合率百分比
 */
export function computeOutpatientMinorSurgeryWoundHealingRateV13(records: OutpatientMinorSurgeryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalWound, 0);
  if (total === 0) return 0;
  const healed = records.reduce((acc, r) => acc + r.healed, 0);
  return Math.round((healed / total) * 10000) / 100;
}

/**
 * 门诊手术并发症率（纯函数，反向指标越低越好）：门诊手术并发症数/门诊手术总数×100，保留 2 位小数。
 *
 * @param records 门诊小手术管理记录列表
 * @returns 门诊手术并发症率百分比
 */
export function computeOutpatientMinorSurgeryComplicationRateV13(records: OutpatientMinorSurgeryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurgery, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.complication, 0);
  return Math.round((complication / total) * 10000) / 100;
}
