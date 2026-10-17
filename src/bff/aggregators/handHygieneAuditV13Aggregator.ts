/**
 * 健澜科技 jlmedaios - 手卫生督查 V13 纯函数（M423-A，换名避让旧版 handHygieneComplianceV13（M418））
 *
 * computeHandHygieneAuditCoverageRateV13 / computeHandHygieneSuppliesConsumptionRateV13 / computeHandHygieneTrainingCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手卫生督查记录 */
export interface HandHygieneAuditRecordV13 {
  auditedDept: number;
  shouldAuditDept: number;
  suppliesCompliantDept: number;
  deptTotal: number;
  trainedPersons: number;
  shouldTrainPersons: number;
}

/**
 * 手卫生督查覆盖率（纯函数）：督查科室数/应督查科室总数×100，保留 2 位小数。
 *
 * @param records 手卫生督查记录列表
 * @returns 手卫生督查覆盖率百分比
 */
export function computeHandHygieneAuditCoverageRateV13(records: HandHygieneAuditRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAuditDept, 0);
  if (total === 0) return 0;
  const audited = records.reduce((acc, r) => acc + r.auditedDept, 0);
  return Math.round((audited / total) * 10000) / 100;
}

/**
 * 手卫生用品消耗达标率（纯函数）：达标消耗科室数/科室总数×100，保留 2 位小数。
 *
 * @param records 手卫生督查记录列表
 * @returns 手卫生用品消耗达标率百分比
 */
export function computeHandHygieneSuppliesConsumptionRateV13(records: HandHygieneAuditRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deptTotal, 0);
  if (total === 0) return 0;
  const supplies = records.reduce((acc, r) => acc + r.suppliesCompliantDept, 0);
  return Math.round((supplies / total) * 10000) / 100;
}

/**
 * 手卫生培训覆盖率（纯函数）：培训覆盖人数/应培训总人数×100，保留 2 位小数。
 *
 * @param records 手卫生督查记录列表
 * @returns 手卫生培训覆盖率百分比
 */
export function computeHandHygieneTrainingCoverageRateV13(records: HandHygieneAuditRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTrainPersons, 0);
  if (total === 0) return 0;
  const trained = records.reduce((acc, r) => acc + r.trainedPersons, 0);
  return Math.round((trained / total) * 10000) / 100;
}
