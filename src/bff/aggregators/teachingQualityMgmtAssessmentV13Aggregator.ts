/**
 * 健澜科技 jlmedaios - 教学质量评估 V13 纯函数（M443-D，M443 收官，教学科研与继续教育管理组）
 *
 * computeTeachingQualityRoundQualifiedRateV13 / computeTeachingQualityClinicalSatisfactionRateV13 / computeTeachingQualityAccidentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 教学质量评估记录 */
export interface TeachingQualityMgmtAssessmentRecordV13 {
  qualifiedRound: number;
  totalRound: number;
  satisfiedStudent: number;
  surveyedStudent: number;
  teachingAccident: number;
  totalTeachingActivity: number;
}

/**
 * 教学查房合格率（纯函数）：合格教学查房次数/教学查房总次数×100，保留 2 位小数。
 *
 * @param records 教学质量评估记录列表
 * @returns 教学查房合格率百分比
 */
export function computeTeachingQualityRoundQualifiedRateV13(records: TeachingQualityMgmtAssessmentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRound, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedRound, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 临床带教满意度（纯函数）：满意带教学生数/调查带教学生总数×100，保留 2 位小数。
 *
 * @param records 教学质量评估记录列表
 * @returns 临床带教满意度百分比
 */
export function computeTeachingQualityClinicalSatisfactionRateV13(records: TeachingQualityMgmtAssessmentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedStudent, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedStudent, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 教学事故发生率（纯函数，反向指标，越低越好）：教学事故数/教学活动总次数×100，保留 2 位小数。
 *
 * @param records 教学质量评估记录列表
 * @returns 教学事故发生率百分比
 */
export function computeTeachingQualityAccidentRateV13(records: TeachingQualityMgmtAssessmentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTeachingActivity, 0);
  if (total === 0) return 0;
  const accident = records.reduce((acc, r) => acc + r.teachingAccident, 0);
  return Math.round((accident / total) * 10000) / 100;
}
