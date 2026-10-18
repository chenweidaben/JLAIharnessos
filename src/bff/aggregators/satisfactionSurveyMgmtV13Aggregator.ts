/**
 * 健澜科技 jlmedaios - 满意度调查管理 V13 纯函数（M451-D，M451 收官，医患关系与投诉管理组）
 *
 * computeSatisfactionSurveyOutpatientRateV13 / computeSatisfactionSurveyInpatientRateV13 / computeSatisfactionSurveyStaffRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 满意度调查管理记录 */
export interface SatisfactionSurveyMgmtRecordV13 {
  outpatientSatisfied: number;
  outpatientTotal: number;
  inpatientSatisfied: number;
  inpatientTotal: number;
  staffSatisfied: number;
  staffTotal: number;
}

/**
 * 门诊满意度（纯函数）：门诊满意人次/门诊调查总人次×100，保留 2 位小数。
 *
 * @param records 满意度调查管理记录列表
 * @returns 门诊满意度百分比
 */
export function computeSatisfactionSurveyOutpatientRateV13(records: SatisfactionSurveyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientTotal, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.outpatientSatisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 住院满意度（纯函数）：住院满意人次/住院调查总人次×100，保留 2 位小数。
 *
 * @param records 满意度调查管理记录列表
 * @returns 住院满意度百分比
 */
export function computeSatisfactionSurveyInpatientRateV13(records: SatisfactionSurveyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.inpatientSatisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 职工满意度（纯函数）：职工满意人数/职工调查总人数×100，保留 2 位小数。
 *
 * @param records 满意度调查管理记录列表
 * @returns 职工满意度百分比
 */
export function computeSatisfactionSurveyStaffRateV13(records: SatisfactionSurveyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.staffTotal, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.staffSatisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}
