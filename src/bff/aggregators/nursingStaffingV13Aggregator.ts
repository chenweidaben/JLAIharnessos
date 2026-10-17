/**
 * 健澜科技 jlmedaios - 护理人力配置 V13 纯函数（M358-C）
 *
 * computeBedNurseRatioV13 / computeWardNursePatientRatioV13 / computeIcuNursePatientRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理人力配置记录 */
export interface NursingStaffingRecordV13 {
  beds: number;
  nurses: number;
  wardNurses: number;
  wardBeds: number;
  icuNurses: number;
  icuBeds: number;
}

/**
 * 床护比（纯函数）：床位数/护士数，保留 3 位小数。
 *
 * @param records 护理人力配置记录列表
 * @returns 床护比
 */
export function computeBedNurseRatioV13(records: NursingStaffingRecordV13[]): number {
  const beds = records.reduce((acc, r) => acc + r.beds, 0);
  const nurses = records.reduce((acc, r) => acc + r.nurses, 0);
  if (nurses === 0) return 0;
  return Math.round((beds / nurses) * 1000) / 1000;
}

/**
 * 普通病房护患比（纯函数）：护士数/床位数，保留 3 位小数。
 *
 * @param records 护理人力配置记录列表
 * @returns 普通病房护患比
 */
export function computeWardNursePatientRatioV13(records: NursingStaffingRecordV13[]): number {
  const wardNurses = records.reduce((acc, r) => acc + r.wardNurses, 0);
  const wardBeds = records.reduce((acc, r) => acc + r.wardBeds, 0);
  if (wardBeds === 0) return 0;
  return Math.round((wardNurses / wardBeds) * 1000) / 1000;
}

/**
 * ICU 护患比（纯函数）：护士数/床位数，保留 3 位小数。
 *
 * @param records 护理人力配置记录列表
 * @returns ICU 护患比
 */
export function computeIcuNursePatientRatioV13(records: NursingStaffingRecordV13[]): number {
  const icuNurses = records.reduce((acc, r) => acc + r.icuNurses, 0);
  const icuBeds = records.reduce((acc, r) => acc + r.icuBeds, 0);
  if (icuBeds === 0) return 0;
  return Math.round((icuNurses / icuBeds) * 1000) / 1000;
}
