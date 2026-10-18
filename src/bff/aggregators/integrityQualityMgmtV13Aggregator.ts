/**
 * 健澜科技 jlmedaios - 廉洁行医质量管理 V13 纯函数（M438-B，行风廉洁与职业道德建设组）
 *
 * computeIntegrityEducationCoverageRateV13 / computeIntegrityViolationInvestigationRateV13 / computeIntegrityPetitionFilingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 廉洁行医质量管理记录 */
export interface IntegrityQualityMgmtRecordV13 {
  trainedPeople: number;
  shouldTrain: number;
  investigatedViolation: number;
  totalViolation: number;
  resolvedPetition: number;
  totalPetition: number;
}

/**
 * 廉洁教育培训覆盖率（纯函数）：已培训人数/应培训总人数×100，保留 2 位小数。
 *
 * @param records 廉洁行医质量管理记录列表
 * @returns 廉洁教育培训覆盖率百分比
 */
export function computeIntegrityEducationCoverageRateV13(records: IntegrityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTrain, 0);
  if (total === 0) return 0;
  const trained = records.reduce((acc, r) => acc + r.trainedPeople, 0);
  return Math.round((trained / total) * 10000) / 100;
}

/**
 * 违规查处率（纯函数）：已查处违规数/发现违规总数×100，保留 2 位小数。
 *
 * @param records 廉洁行医质量管理记录列表
 * @returns 违规查处率百分比
 */
export function computeIntegrityViolationInvestigationRateV13(records: IntegrityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalViolation, 0);
  if (total === 0) return 0;
  const investigated = records.reduce((acc, r) => acc + r.investigatedViolation, 0);
  return Math.round((investigated / total) * 10000) / 100;
}

/**
 * 信访举报办结率（纯函数）：已办结信访数/受理信访总数×100，保留 2 位小数。
 *
 * @param records 廉洁行医质量管理记录列表
 * @returns 信访举报办结率百分比
 */
export function computeIntegrityPetitionFilingRateV13(records: IntegrityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPetition, 0);
  if (total === 0) return 0;
  const resolved = records.reduce((acc, r) => acc + r.resolvedPetition, 0);
  return Math.round((resolved / total) * 10000) / 100;
}
