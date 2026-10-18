/**
 * 健澜科技 jlmedaios - 医院文化建设管理 V13 纯函数（M457-A，医院文化与公益管理组）
 *
 * computeHospitalCultureActivityParticipationRateV13 / computeHospitalCultureEmployeeSatisfactionRateV13 / computeHospitalCultureVenueOpenRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医院文化建设管理记录 */
export interface HospitalCultureMgmtRecordV13 {
  participated: number;
  totalEmployee: number;
  satisfied: number;
  totalSurvey: number;
  opened: number;
  totalVenue: number;
}

/**
 * 文化活动参与率（纯函数）：参与文化活动员工数/员工总数×100，保留 2 位小数。
 *
 * @param records 医院文化建设管理记录列表
 * @returns 文化活动参与率百分比
 */
export function computeHospitalCultureActivityParticipationRateV13(records: HospitalCultureMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEmployee, 0);
  if (total === 0) return 0;
  const participated = records.reduce((acc, r) => acc + r.participated, 0);
  return Math.round((participated / total) * 10000) / 100;
}

/**
 * 员工文化满意度（纯函数）：满意员工数/参与调查员工总数×100，保留 2 位小数。
 *
 * @param records 医院文化建设管理记录列表
 * @returns 员工文化满意度百分比
 */
export function computeHospitalCultureEmployeeSatisfactionRateV13(records: HospitalCultureMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurvey, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 文化阵地开放率（纯函数）：已开放文化阵地数/文化阵地总数×100，保留 2 位小数。
 *
 * @param records 医院文化建设管理记录列表
 * @returns 文化阵地开放率百分比
 */
export function computeHospitalCultureVenueOpenRateV13(records: HospitalCultureMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalVenue, 0);
  if (total === 0) return 0;
  const opened = records.reduce((acc, r) => acc + r.opened, 0);
  return Math.round((opened / total) * 10000) / 100;
}
