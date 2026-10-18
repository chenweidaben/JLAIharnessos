/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 纯函数（M443-B，教学科研与继续教育管理组）
 *
 * computeContinuingEducationCreditComplianceRateV13 / computeContinuingEducationNationalProjectRateV13 / computeContinuingEducationProvincialProjectRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 继续医学教育记录 */
export interface ContinuingEducationMgmtRecordV13 {
  creditCompliant: number;
  shouldComplete: number;
  nationalProjectParticipated: number;
  shouldParticipate: number;
  provincialProjectParticipated: number;
}

/**
 * 学分达标率（纯函数）：学分达标人数/应完成学分人数×100，保留 2 位小数。
 *
 * @param records 继续医学教育记录列表
 * @returns 学分达标率百分比
 */
export function computeContinuingEducationCreditComplianceRateV13(records: ContinuingEducationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldComplete, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.creditCompliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 国家级项目参与率（纯函数）：参与国家级继教项目人数/应参与总人数×100，保留 2 位小数。
 *
 * @param records 继续医学教育记录列表
 * @returns 国家级项目参与率百分比
 */
export function computeContinuingEducationNationalProjectRateV13(records: ContinuingEducationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldParticipate, 0);
  if (total === 0) return 0;
  const national = records.reduce((acc, r) => acc + r.nationalProjectParticipated, 0);
  return Math.round((national / total) * 10000) / 100;
}

/**
 * 省级项目参与率（纯函数）：参与省级继教项目人数/应参与总人数×100，保留 2 位小数。
 *
 * @param records 继续医学教育记录列表
 * @returns 省级项目参与率百分比
 */
export function computeContinuingEducationProvincialProjectRateV13(records: ContinuingEducationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldParticipate, 0);
  if (total === 0) return 0;
  const provincial = records.reduce((acc, r) => acc + r.provincialProjectParticipated, 0);
  return Math.round((provincial / total) * 10000) / 100;
}
