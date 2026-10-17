/**
 * 健澜科技 jlmedaios - 分级护理 V13 纯函数（M404-D，M404 收官）
 *
 * computeSpecialGradeNursingPassRateV13 / computeFirstGradeNursingPassRateV13 / computeNursingRoundsArrivalRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 分级护理记录 */
export interface GradeNursingRecordV13 {
  specialPass: number;
  specialTotal: number;
  firstPass: number;
  firstTotal: number;
  roundsArrived: number;
  roundsTotal: number;
}

/**
 * 特级护理合格率（纯函数）：合格次数/检查总次数×100，保留 2 位小数。
 *
 * @param records 分级护理记录列表
 * @returns 特级护理合格率百分比
 */
export function computeSpecialGradeNursingPassRateV13(records: GradeNursingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specialTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.specialPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 一级护理合格率（纯函数）：合格次数/检查总次数×100，保留 2 位小数。
 *
 * @param records 分级护理记录列表
 * @returns 一级护理合格率百分比
 */
export function computeFirstGradeNursingPassRateV13(records: GradeNursingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.firstTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.firstPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 护理巡视到位率（纯函数）：到位次数/应巡视总次数×100，保留 2 位小数。
 *
 * @param records 分级护理记录列表
 * @returns 护理巡视到位率百分比
 */
export function computeNursingRoundsArrivalRateV13(records: GradeNursingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.roundsTotal, 0);
  if (total === 0) return 0;
  const arrived = records.reduce((acc, r) => acc + r.roundsArrived, 0);
  return Math.round((arrived / total) * 10000) / 100;
}
