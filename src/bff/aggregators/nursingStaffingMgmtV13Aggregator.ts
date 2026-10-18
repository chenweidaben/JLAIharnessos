/**
 * 健澜科技 jlmedaios - 护理人力配置管理 V13 纯函数（M453-B，护理管理组）
 *
 * computeNursingStaffingBedRatioComplianceRateV13 / computeNursingStaffingQualificationRateV13 / computeNursingStaffingSchedulingComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理人力配置管理记录 */
export interface NursingStaffingMgmtRecordV13 {
  compliantDept: number;
  totalDept: number;
  qualifiedNurse: number;
  totalNurse: number;
  compliantSchedule: number;
  totalSchedule: number;
}

/**
 * 床护比达标率（纯函数）：达标病区数/病区总数×100，保留 2 位小数。
 *
 * @param records 护理人力配置管理记录列表
 * @returns 床护比达标率百分比
 */
export function computeNursingStaffingBedRatioComplianceRateV13(records: NursingStaffingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDept, 0);
  if (total === 0) return 0;
  const compliantDept = records.reduce((acc, r) => acc + r.compliantDept, 0);
  return Math.round((compliantDept / total) * 10000) / 100;
}

/**
 * 护理人员资质合格率（纯函数）：资质合格护士数/护士总数×100，保留 2 位小数。
 *
 * @param records 护理人力配置管理记录列表
 * @returns 护理人员资质合格率百分比
 */
export function computeNursingStaffingQualificationRateV13(records: NursingStaffingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalNurse, 0);
  if (total === 0) return 0;
  const qualifiedNurse = records.reduce((acc, r) => acc + r.qualifiedNurse, 0);
  return Math.round((qualifiedNurse / total) * 10000) / 100;
}

/**
 * 护理排班合规率（纯函数）：合规排班次数/排班总次数×100，保留 2 位小数。
 *
 * @param records 护理人力配置管理记录列表
 * @returns 护理排班合规率百分比
 */
export function computeNursingStaffingSchedulingComplianceRateV13(records: NursingStaffingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSchedule, 0);
  if (total === 0) return 0;
  const compliantSchedule = records.reduce((acc, r) => acc + r.compliantSchedule, 0);
  return Math.round((compliantSchedule / total) * 10000) / 100;
}
