/**
 * 健澜科技 jlmedaios - 中药房 V13 纯函数（M380-D，M380 收官）
 *
 * computeTCMHerbVarietyCountV13 / computeTCMDecoctionCountV13 / computeTCMPrescriptionCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 中药房记录 */
export interface TCMpharmacyRecordV13 {
  herbVarietyCount: number;
  decoctionCount: number;
  prescriptionCount: number;
}

/**
 * 中药饮片品种数（纯函数）：求和。
 *
 * @param records 中药房记录列表
 * @returns 中药饮片品种数
 */
export function computeTCMHerbVarietyCountV13(records: TCMpharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.herbVarietyCount, 0);
}

/**
 * 中药代煎剂人次（纯函数）：求和。
 *
 * @param records 中药房记录列表
 * @returns 中药代煎剂人次
 */
export function computeTCMDecoctionCountV13(records: TCMpharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.decoctionCount, 0);
}

/**
 * 中药处方数（纯函数）：求和。
 *
 * @param records 中药房记录列表
 * @returns 中药处方数
 */
export function computeTCMPrescriptionCountV13(records: TCMpharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.prescriptionCount, 0);
}
