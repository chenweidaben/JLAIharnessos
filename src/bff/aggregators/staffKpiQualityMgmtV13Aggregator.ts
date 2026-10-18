/**
 * 健澜科技 jlmedaios - 个人 KPI 质量管理 V13 纯函数（M433-B，-quality 后缀避让旧版 staffKpiMgmtV13（M410））
 *
 * computeStaffKpiCompletionRateV13 / computeStaffKpiAchievementRateV13 / computeStaffKpiExcellenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 个人 KPI 质量管理记录 */
export interface StaffKpiQualityMgmtRecordV13 {
  completedStaff: number;
  shouldAssessStaff: number;
  achievedStaff: number;
  assessedStaff: number;
  excellentStaff: number;
}

/**
 * 个人 KPI 完成率（纯函数）：已完成 KPI 人数/应考核职工总数×100，保留 2 位小数。
 *
 * @param records 个人 KPI 质量管理记录列表
 * @returns 个人 KPI 完成率百分比
 */
export function computeStaffKpiCompletionRateV13(records: StaffKpiQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAssessStaff, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedStaff, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 个人 KPI 达标率（纯函数）：达标 KPI 人数/考核职工总数×100，保留 2 位小数。
 *
 * @param records 个人 KPI 质量管理记录列表
 * @returns 个人 KPI 达标率百分比
 */
export function computeStaffKpiAchievementRateV13(records: StaffKpiQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.assessedStaff, 0);
  if (total === 0) return 0;
  const achieved = records.reduce((acc, r) => acc + r.achievedStaff, 0);
  return Math.round((achieved / total) * 10000) / 100;
}

/**
 * 个人 KPI 优秀率（纯函数）：优秀职工人数/考核职工总数×100，保留 2 位小数。
 *
 * @param records 个人 KPI 质量管理记录列表
 * @returns 个人 KPI 优秀率百分比
 */
export function computeStaffKpiExcellenceRateV13(records: StaffKpiQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.assessedStaff, 0);
  if (total === 0) return 0;
  const excellent = records.reduce((acc, r) => acc + r.excellentStaff, 0);
  return Math.round((excellent / total) * 10000) / 100;
}
