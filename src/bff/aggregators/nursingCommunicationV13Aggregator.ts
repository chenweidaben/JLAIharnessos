/**
 * 健澜科技 jlmedaios - 护患沟通 V13 纯函数（M405-B）
 *
 * computeNursePatientCommunicationSatisfactionRateV13 / computeHealthEducationCoverageRateV13 / computeDischargeGuidelineAwarenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护患沟通记录 */
export interface NursingCommunicationRecordV13 {
  satisfied: number;
  totalSurvey: number;
  covered: number;
  shouldCover: number;
  aware: number;
  totalAwareness: number;
}

/**
 * 护患沟通满意度（纯函数）：满意人数/调查总人数×100，保留 2 位小数。
 *
 * @param records 护患沟通记录列表
 * @returns 护患沟通满意度百分比
 */
export function computeNursePatientCommunicationSatisfactionRateV13(records: NursingCommunicationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurvey, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 健康教育覆盖率（纯函数）：已覆盖人数/应覆盖人数×100，保留 2 位小数。
 *
 * @param records 护患沟通记录列表
 * @returns 健康教育覆盖率百分比
 */
export function computeHealthEducationCoverageRateV13(records: NursingCommunicationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldCover, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.covered, 0);
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 出院指导知晓率（纯函数）：知晓人数/调查总人数×100，保留 2 位小数。
 *
 * @param records 护患沟通记录列表
 * @returns 出院指导知晓率百分比
 */
export function computeDischargeGuidelineAwarenessRateV13(records: NursingCommunicationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAwareness, 0);
  if (total === 0) return 0;
  const aware = records.reduce((acc, r) => acc + r.aware, 0);
  return Math.round((aware / total) * 10000) / 100;
}
