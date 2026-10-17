/**
 * 健澜科技 jlmedaios - 患者体验统计 V13 纯函数（M386-A，stats 避让）
 *
 * computeSatisfactionScoreV13 / computeComplaintResolutionHoursV13 / computeComplimentLetterCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者体验统计记录 */
export interface PatientExperienceRecordV13 {
  totalScore: number;
  surveyCount: number;
  totalHours: number;
  complaintCount: number;
  complimentCount: number;
}

/**
 * 满意度评分（纯函数）：平均评分，保留 2 位小数，满分 5 分。
 *
 * @param records 患者体验统计记录列表
 * @returns 满意度评分
 */
export function computeSatisfactionScoreV13(records: PatientExperienceRecordV13[]): number {
  const surveys = records.reduce((acc, r) => acc + r.surveyCount, 0);
  if (surveys === 0) return 0;
  const score = records.reduce((acc, r) => acc + r.totalScore, 0);
  return Math.round((score / surveys) * 100) / 100;
}

/**
 * 投诉处理时长（纯函数）：总处理小时数/投诉数，保留 2 位小数。
 *
 * @param records 患者体验统计记录列表
 * @returns 投诉处理时长（小时）
 */
export function computeComplaintResolutionHoursV13(records: PatientExperienceRecordV13[]): number {
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  if (complaints === 0) return 0;
  const hours = records.reduce((acc, r) => acc + r.totalHours, 0);
  return Math.round((hours / complaints) * 100) / 100;
}

/**
 * 表扬信数（纯函数）：求和。
 *
 * @param records 患者体验统计记录列表
 * @returns 表扬信数
 */
export function computeComplimentLetterCountV13(records: PatientExperienceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.complimentCount, 0);
}
