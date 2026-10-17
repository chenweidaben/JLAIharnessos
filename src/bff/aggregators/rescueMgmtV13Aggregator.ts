/**
 * 健澜科技 jlmedaios - 抢救管理 V13 纯函数（M415-A）
 *
 * computeRescueRecordCompletenessRateV13 / computeRescueSuccessAssessmentRateV13 / computeRescueEquipmentIntegrityRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抢救管理记录 */
export interface RescueMgmtRecordV13 {
  complete: number;
  recordTotal: number;
  assessedSuccess: number;
  rescueTotal: number;
  intact: number;
  equipmentTotal: number;
}

/**
 * 抢救记录完整率（纯函数）：完整记录数/抢救记录总数×100，保留 2 位小数。
 *
 * @param records 抢救管理记录列表
 * @returns 抢救记录完整率百分比
 */
export function computeRescueRecordCompletenessRateV13(records: RescueMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recordTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 抢救成功评估率（纯函数）：已评估成功例数/抢救总例数×100，保留 2 位小数。
 *
 * @param records 抢救管理记录列表
 * @returns 抢救成功评估率百分比
 */
export function computeRescueSuccessAssessmentRateV13(records: RescueMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.rescueTotal, 0);
  if (total === 0) return 0;
  const assessedSuccess = records.reduce((acc, r) => acc + r.assessedSuccess, 0);
  return Math.round((assessedSuccess / total) * 10000) / 100;
}

/**
 * 抢救设备完好率（纯函数）：完好设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 抢救管理记录列表
 * @returns 抢救设备完好率百分比
 */
export function computeRescueEquipmentIntegrityRateV13(records: RescueMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.equipmentTotal, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.intact, 0);
  return Math.round((intact / total) * 10000) / 100;
}
