/**
 * 健澜科技 jlmedaios - 病房管理（细节）V13 纯函数（M417-D，M417 收官，detail 避让旧版 inpatientBedMgmtV13）
 *
 * computeWardBedTurnoverRateV13 / computeWardAverageLosDaysV13 / computeWardVisitCompanionMgmtPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病房管理（细节）记录 */
export interface WardMgmtDetailRecordV13 {
  dischargeTotal: number;
  avgBeds: number;
  losDays: number;
  qualified: number;
  visitCompanionTotal: number;
}

/**
 * 病房床位周转次数（纯函数）：总出院人数/平均开放床位数，单位次，保留 1 位小数。
 *
 * @param records 病房管理（细节）记录列表
 * @returns 病房床位周转次数（次）
 */
export function computeWardBedTurnoverRateV13(records: WardMgmtDetailRecordV13[]): number {
  const totalBeds = records.reduce((acc, r) => acc + r.avgBeds, 0);
  if (totalBeds === 0) return 0;
  const dischargeTotal = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  return Math.round((dischargeTotal / totalBeds) * 10) / 10;
}

/**
 * 病房平均住院日（纯函数）：平均值，单位天，保留 1 位小数。
 *
 * @param records 病房管理（细节）记录列表
 * @returns 病房平均住院日（天）
 */
export function computeWardAverageLosDaysV13(records: WardMgmtDetailRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.losDays, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 病房探视与陪护管理合格率（纯函数）：合格次数/探视陪护总次数×100，保留 2 位小数。
 *
 * @param records 病房管理（细节）记录列表
 * @returns 病房探视与陪护管理合格率百分比
 */
export function computeWardVisitCompanionMgmtPassRateV13(records: WardMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.visitCompanionTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
