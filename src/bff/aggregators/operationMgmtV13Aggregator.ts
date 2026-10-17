/**
 * 健澜科技 jlmedaios - 运营管理 V13 纯函数（M364-A）
 *
 * computeAvgLOSV13 / computeBedTurnoverRateV13 / computeSurgeryIntervalDaysV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 运营管理记录 */
export interface OperationMgmtRecordV13 {
  avgLOS: number;
  bedTurnoverDischarged: number;
  avgOpenBeds: number;
  surgeryIntervalDays: number;
}

/**
 * 平均住院日（纯函数）：均值，保留 2 位小数。
 *
 * @param records 运营管理记录列表
 * @returns 平均住院日
 */
export function computeAvgLOSV13(records: OperationMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.avgLOS, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 床位周转率（纯函数）：出院人数/平均开放床位数，保留 2 位小数。
 *
 * @param records 运营管理记录列表
 * @returns 床位周转率
 */
export function computeBedTurnoverRateV13(records: OperationMgmtRecordV13[]): number {
  const discharged = records.reduce((acc, r) => acc + r.bedTurnoverDischarged, 0);
  const beds = records.reduce((acc, r) => acc + r.avgOpenBeds, 0);
  if (beds === 0) return 0;
  return Math.round((discharged / beds) * 100) / 100;
}

/**
 * 手术间隔天数（纯函数）：均值，保留 2 位小数。
 *
 * @param records 运营管理记录列表
 * @returns 手术间隔天数
 */
export function computeSurgeryIntervalDaysV13(records: OperationMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.surgeryIntervalDays, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
