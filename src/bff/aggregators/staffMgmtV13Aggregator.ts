/**
 * 健澜科技 jlmedaios - 人员管理 V13 纯函数（M362-A）
 *
 * computeHealthTechRatioV13 / computeDoctorNurseRatioV13 / computeBedWorkerRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人员管理记录 */
export interface StaffMgmtRecordV13 {
  healthTech: number;
  totalStaff: number;
  nurseCount: number;
  doctorCount: number;
  workerCount: number;
  bedCount: number;
}

/**
 * 卫生技术人员占比（纯函数）：卫技人员数/职工总数×100，保留 2 位小数。
 *
 * @param records 人员管理记录列表
 * @returns 卫生技术人员占比百分比
 */
export function computeHealthTechRatioV13(records: StaffMgmtRecordV13[]): number {
  const healthTech = records.reduce((acc, r) => acc + r.healthTech, 0);
  const total = records.reduce((acc, r) => acc + r.totalStaff, 0);
  if (total === 0) return 0;
  return Math.round((healthTech / total) * 10000) / 100;
}

/**
 * 医护比（纯函数）：护士数/医师数，保留 3 位小数。
 *
 * @param records 人员管理记录列表
 * @returns 医护比
 */
export function computeDoctorNurseRatioV13(records: StaffMgmtRecordV13[]): number {
  const nurses = records.reduce((acc, r) => acc + r.nurseCount, 0);
  const doctors = records.reduce((acc, r) => acc + r.doctorCount, 0);
  if (doctors === 0) return 0;
  return Math.round((nurses / doctors) * 1000) / 1000;
}

/**
 * 床工比（纯函数）：工勤数/床位数，保留 3 位小数。
 *
 * @param records 人员管理记录列表
 * @returns 床工比
 */
export function computeBedWorkerRatioV13(records: StaffMgmtRecordV13[]): number {
  const workers = records.reduce((acc, r) => acc + r.workerCount, 0);
  const beds = records.reduce((acc, r) => acc + r.bedCount, 0);
  if (beds === 0) return 0;
  return Math.round((workers / beds) * 1000) / 1000;
}
