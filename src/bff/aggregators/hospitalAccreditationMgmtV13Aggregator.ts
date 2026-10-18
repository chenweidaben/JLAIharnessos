/**
 * 健澜科技 jlmedaios - 医院评审迎检管理 V13 纯函数（M452-A，医院评审与临床质量改进组）
 *
 * computeHospitalAccreditationTaskCompletionRateV13 / computeHospitalAccreditationClauseComplianceRateV13 / computeHospitalAccreditationRectificationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医院评审迎检管理记录 */
export interface HospitalAccreditationMgmtRecordV13 {
  completed: number;
  totalTask: number;
  qualified: number;
  totalClause: number;
  rectified: number;
  totalIssue: number;
}

/**
 * 评审任务完成率（纯函数）：已完成评审任务数/评审任务总数×100，保留 2 位小数。
 *
 * @param records 医院评审迎检管理记录列表
 * @returns 评审任务完成率百分比
 */
export function computeHospitalAccreditationTaskCompletionRateV13(records: HospitalAccreditationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTask, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 评审条款达标率（纯函数）：达标条款数/评审条款总数×100，保留 2 位小数。
 *
 * @param records 医院评审迎检管理记录列表
 * @returns 评审条款达标率百分比
 */
export function computeHospitalAccreditationClauseComplianceRateV13(records: HospitalAccreditationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalClause, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 评审问题整改率（纯函数）：已整改问题数/评审问题总数×100，保留 2 位小数。
 *
 * @param records 医院评审迎检管理记录列表
 * @returns 评审问题整改率百分比
 */
export function computeHospitalAccreditationRectificationRateV13(records: HospitalAccreditationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalIssue, 0);
  if (total === 0) return 0;
  const rectified = records.reduce((acc, r) => acc + r.rectified, 0);
  return Math.round((rectified / total) * 10000) / 100;
}
