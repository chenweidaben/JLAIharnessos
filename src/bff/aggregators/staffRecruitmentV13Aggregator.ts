/**
 * 健澜科技 jlmedaios - 人员招聘 V13 纯函数（M384-A）
 *
 * computeRecruitmentPositionCountV13 / computeHiredCountV13 / computeRecruitmentOnboardRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人员招聘记录 */
export interface StaffRecruitmentRecordV13 {
  positionCount: number;
  hiredCount: number;
  onboardCount: number;
}

/**
 * 招聘岗位数（纯函数）：求和。
 *
 * @param records 人员招聘记录列表
 * @returns 招聘岗位数
 */
export function computeRecruitmentPositionCountV13(records: StaffRecruitmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.positionCount, 0);
}

/**
 * 录用人数（纯函数）：求和。
 *
 * @param records 人员招聘记录列表
 * @returns 录用人数
 */
export function computeHiredCountV13(records: StaffRecruitmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.hiredCount, 0);
}

/**
 * 招聘到岗率（纯函数）：到岗人数/录用人数×100，保留 2 位小数。
 *
 * @param records 人员招聘记录列表
 * @returns 招聘到岗率百分比
 */
export function computeRecruitmentOnboardRateV13(records: StaffRecruitmentRecordV13[]): number {
  const hired = records.reduce((acc, r) => acc + r.hiredCount, 0);
  if (hired === 0) return 0;
  const onboard = records.reduce((acc, r) => acc + r.onboardCount, 0);
  return Math.round((onboard / hired) * 10000) / 100;
}
