/**
 * 健澜科技 jlmedaios - 培训管理（细节）V13 纯函数（M419-C，detail 避让旧版 talentTeamMgmtV13/academicLevelV13）
 *
 * computeThreeBasicExamPassRateV13 / computeContinuingEducationCreditComplianceRateV13 / computeEmergencySkillTrainingPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 培训管理（细节）记录 */
export interface TrainingMgmtDetailRecordV13 {
  threeBasicPassed: number;
  threeBasicTook: number;
  ceCreditMet: number;
  ceCreditShould: number;
  emergencyPassed: number;
  emergencyTrained: number;
}

/**
 * 三基考核合格率（纯函数）：合格人数/参考总人数×100，保留 2 位小数。
 *
 * @param records 培训管理（细节）记录列表
 * @returns 三基考核合格率百分比
 */
export function computeThreeBasicExamPassRateV13(records: TrainingMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.threeBasicTook, 0);
  if (total === 0) return 0;
  const threeBasicPassed = records.reduce((acc, r) => acc + r.threeBasicPassed, 0);
  return Math.round((threeBasicPassed / total) * 10000) / 100;
}

/**
 * 继续教育学分达标率（纯函数）：达标人数/应达标人数×100，保留 2 位小数。
 *
 * @param records 培训管理（细节）记录列表
 * @returns 继续教育学分达标率百分比
 */
export function computeContinuingEducationCreditComplianceRateV13(records: TrainingMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.ceCreditShould, 0);
  if (total === 0) return 0;
  const ceCreditMet = records.reduce((acc, r) => acc + r.ceCreditMet, 0);
  return Math.round((ceCreditMet / total) * 10000) / 100;
}

/**
 * 急救技能培训合格率（纯函数）：合格人数/培训总人数×100，保留 2 位小数。
 *
 * @param records 培训管理（细节）记录列表
 * @returns 急救技能培训合格率百分比
 */
export function computeEmergencySkillTrainingPassRateV13(records: TrainingMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.emergencyTrained, 0);
  if (total === 0) return 0;
  const emergencyPassed = records.reduce((acc, r) => acc + r.emergencyPassed, 0);
  return Math.round((emergencyPassed / total) * 10000) / 100;
}
