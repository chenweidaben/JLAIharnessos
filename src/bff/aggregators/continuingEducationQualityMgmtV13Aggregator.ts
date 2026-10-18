/**
 * 健澜科技 jlmedaios - 继续教育质量管理 V13 纯函数（M434-C，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * computeContinuingEducationCompletionRateV13 / computeContinuingEducationCreditPassRateV13 / computeContinuingEducationTrainingCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 继续教育质量管理记录 */
export interface ContinuingEducationQualityMgmtRecordV13 {
  completedCredits: number;
  shouldCompleteCredits: number;
  qualifiedStaff: number;
  shouldQualifiedStaff: number;
  trainedStaff: number;
  totalStaff: number;
}

/**
 * 继教完成率（纯函数）：完成继教学分数/应完成继教学分总数×100，保留 2 位小数。
 *
 * @param records 继续教育质量管理记录列表
 * @returns 继教完成率百分比
 */
export function computeContinuingEducationCompletionRateV13(records: ContinuingEducationQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldCompleteCredits, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCredits, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 学分达标率（纯函数）：达标职工数/应达标职工总数×100，保留 2 位小数。
 *
 * @param records 继续教育质量管理记录列表
 * @returns 学分达标率百分比
 */
export function computeContinuingEducationCreditPassRateV13(records: ContinuingEducationQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldQualifiedStaff, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedStaff, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 培训覆盖率（纯函数）：已培训职工数/职工总数×100，保留 2 位小数。
 *
 * @param records 继续教育质量管理记录列表
 * @returns 培训覆盖率百分比
 */
export function computeContinuingEducationTrainingCoverageRateV13(records: ContinuingEducationQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalStaff, 0);
  if (total === 0) return 0;
  const trained = records.reduce((acc, r) => acc + r.trainedStaff, 0);
  return Math.round((trained / total) * 10000) / 100;
}
