/**
 * 健澜科技 jlmedaios - 绩效考核管理 V13 纯函数（M444-A，绩效薪酬与人力资源管理组）
 *
 * computePerformanceAppraisalDeptQualifiedRateV13 / computePerformanceAppraisalStaffExcellentRateV13 / computePerformanceAppraisalResultApplicationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绩效考核管理记录 */
export interface PerformanceAppraisalMgmtRecordV13 {
  deptQualified: number;
  deptTotal: number;
  staffExcellent: number;
  staffTotal: number;
  resultApplied: number;
  shouldApply: number;
}

/**
 * 科室考核合格率（纯函数）：考核合格科室数/考核科室总数×100，保留 2 位小数。
 *
 * @param records 绩效考核管理记录列表
 * @returns 科室考核合格率百分比
 */
export function computePerformanceAppraisalDeptQualifiedRateV13(records: PerformanceAppraisalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deptTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.deptQualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 个人考核优秀率（纯函数）：考核优秀人数/考核总人数×100，保留 2 位小数。
 *
 * @param records 绩效考核管理记录列表
 * @returns 个人考核优秀率百分比
 */
export function computePerformanceAppraisalStaffExcellentRateV13(records: PerformanceAppraisalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.staffTotal, 0);
  if (total === 0) return 0;
  const excellent = records.reduce((acc, r) => acc + r.staffExcellent, 0);
  return Math.round((excellent / total) * 10000) / 100;
}

/**
 * 考核结果应用率（纯函数）：已应用考核结果次数/应应用次数×100，保留 2 位小数。
 *
 * @param records 绩效考核管理记录列表
 * @returns 考核结果应用率百分比
 */
export function computePerformanceAppraisalResultApplicationRateV13(records: PerformanceAppraisalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldApply, 0);
  if (total === 0) return 0;
  const applied = records.reduce((acc, r) => acc + r.resultApplied, 0);
  return Math.round((applied / total) * 10000) / 100;
}
