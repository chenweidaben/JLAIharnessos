/**
 * 健澜科技 jlmedaios - 护理人力统计 V13 纯函数（M389-D，stats 避让，M389 收官）
 *
 * computeBedNurseRatioV13 / computePatientNurseRatioV13 / computeNightShiftNurseRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理人力统计记录 */
export interface NursingStaffingRecordV13 {
  bedCount: number;
  nurseCount: number;
  patientCount: number;
  shiftNurseCount: number;
  nightNurseCount: number;
  dayNurseCount: number;
}

/**
 * 床护比（纯函数）：开放床位数/注册护士数，保留 2 位小数，1:N。
 *
 * @param records 护理人力统计记录列表
 * @returns 床护比（每床对应护士数）
 */
export function computeBedNurseRatioV13(records: NursingStaffingRecordV13[]): number {
  const nurses = records.reduce((acc, r) => acc + r.nurseCount, 0);
  if (nurses === 0) return 0;
  const beds = records.reduce((acc, r) => acc + r.bedCount, 0);
  return Math.round((beds / nurses) * 100) / 100;
}

/**
 * 护患比（纯函数）：患者数/当班护士数，保留 2 位小数，1:N。
 *
 * @param records 护理人力统计记录列表
 * @returns 护患比（每护士对应患者数）
 */
export function computePatientNurseRatioV13(records: NursingStaffingRecordV13[]): number {
  const nurses = records.reduce((acc, r) => acc + r.shiftNurseCount, 0);
  if (nurses === 0) return 0;
  const patients = records.reduce((acc, r) => acc + r.patientCount, 0);
  return Math.round((patients / nurses) * 100) / 100;
}

/**
 * 夜班护士配比（纯函数）：夜班护士数/白班护士数，保留 2 位小数。
 *
 * @param records 护理人力统计记录列表
 * @returns 夜班护士配比
 */
export function computeNightShiftNurseRatioV13(records: NursingStaffingRecordV13[]): number {
  const day = records.reduce((acc, r) => acc + r.dayNurseCount, 0);
  if (day === 0) return 0;
  const night = records.reduce((acc, r) => acc + r.nightNurseCount, 0);
  return Math.round((night / day) * 100) / 100;
}
