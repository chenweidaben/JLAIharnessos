/**
 * 健澜科技 jlmedaios - 行业作风建设质量管理 V13 纯函数（M438-D，M438 收官，行风廉洁与职业道德建设组）
 *
 * computeIndustryStyleSatisfactionRateV13 / computeIndustryStyleNinePrinciplesAwarenessRateV13 / computeIndustryStyleComplaintDeclineRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 行业作风建设质量管理记录 */
export interface IndustryStyleQualityMgmtRecordV13 {
  satisfiedPatients: number;
  surveyedPatients: number;
  awareStaff: number;
  totalStaff: number;
  lastComplaints: number;
  currentComplaints: number;
}

/**
 * 作风满意度（纯函数）：满意患者数/调查患者总数×100，保留 2 位小数。
 *
 * @param records 行业作风建设质量管理记录列表
 * @returns 作风满意度百分比
 */
export function computeIndustryStyleSatisfactionRateV13(records: IndustryStyleQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedPatients, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedPatients, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 九项准则知晓率（纯函数）：知晓职工数/职工总数×100，保留 2 位小数。
 *
 * @param records 行业作风建设质量管理记录列表
 * @returns 九项准则知晓率百分比
 */
export function computeIndustryStyleNinePrinciplesAwarenessRateV13(records: IndustryStyleQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalStaff, 0);
  if (total === 0) return 0;
  const aware = records.reduce((acc, r) => acc + r.awareStaff, 0);
  return Math.round((aware / total) * 10000) / 100;
}

/**
 * 行风投诉下降率（纯函数，正向指标，越高越好）：(上期投诉数-本期投诉数)/上期投诉数×100，保留 2 位小数。
 *
 * @param records 行业作风建设质量管理记录列表
 * @returns 行风投诉下降率百分比
 */
export function computeIndustryStyleComplaintDeclineRateV13(records: IndustryStyleQualityMgmtRecordV13[]): number {
  const last = records.reduce((acc, r) => acc + r.lastComplaints, 0);
  if (last === 0) return 0;
  const current = records.reduce((acc, r) => acc + r.currentComplaints, 0);
  return Math.round(((last - current) / last) * 10000) / 100;
}
