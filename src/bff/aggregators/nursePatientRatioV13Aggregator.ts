/**
 * 健澜科技 jlmedaios - 护患比 V13 纯函数（M346-C）
 *
 * computeBedCountV13 / computeNurseCountV13 / computeNursePatientRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护患比记录 */
export interface NursePatientRatioRecordV13 {
  bedCount: number;
  nurseCount: number;
}

/**
 * 病区床位数（纯函数）：求和。
 *
 * @param records 护患比记录列表
 * @returns 病区床位数
 */
export function computeBedCountV13(records: NursePatientRatioRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.bedCount, 0);
}

/**
 * 护士数（纯函数）：求和。
 *
 * @param records 护患比记录列表
 * @returns 护士数
 */
export function computeNurseCountV13(records: NursePatientRatioRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.nurseCount, 0);
}

/**
 * 护患比（纯函数）：床位数/护士数，保留 2 位小数。
 *
 * @param records 护患比记录列表
 * @returns 护患比
 */
export function computeNursePatientRatioV13(records: NursePatientRatioRecordV13[]): number {
  const beds = computeBedCountV13(records);
  const nurses = computeNurseCountV13(records);
  if (nurses === 0) return 0;
  return Math.round((beds / nurses) * 100) / 100;
}
