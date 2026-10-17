/**
 * 健澜科技 jlmedaios - 核心制度落实 V13 纯函数（M387-A）
 *
 * computeFirstVisitResponsibilityRateV13 / computeThreeLevelRoundRateV13 / computeDifficultCaseDiscussionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 核心制度落实记录 */
export interface CoreSystemComplianceRecordV13 {
  firstVisitImplemented: number;
  firstVisitShould: number;
  roundImplemented: number;
  roundShould: number;
  discussed: number;
  shouldDiscuss: number;
}

/**
 * 首诊负责落实率（纯函数）：落实数/应落实数×100，保留 2 位小数。
 *
 * @param records 核心制度落实记录列表
 * @returns 首诊负责落实率百分比
 */
export function computeFirstVisitResponsibilityRateV13(records: CoreSystemComplianceRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.firstVisitShould, 0);
  if (should === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.firstVisitImplemented, 0);
  return Math.round((implemented / should) * 10000) / 100;
}

/**
 * 三级查房落实率（纯函数）：落实数/应落实数×100，保留 2 位小数。
 *
 * @param records 核心制度落实记录列表
 * @returns 三级查房落实率百分比
 */
export function computeThreeLevelRoundRateV13(records: CoreSystemComplianceRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.roundShould, 0);
  if (should === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.roundImplemented, 0);
  return Math.round((implemented / should) * 10000) / 100;
}

/**
 * 疑难病例讨论率（纯函数）：讨论数/应讨论数×100，保留 2 位小数。
 *
 * @param records 核心制度落实记录列表
 * @returns 疑难病例讨论率百分比
 */
export function computeDifficultCaseDiscussionRateV13(records: CoreSystemComplianceRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldDiscuss, 0);
  if (should === 0) return 0;
  const discussed = records.reduce((acc, r) => acc + r.discussed, 0);
  return Math.round((discussed / should) * 10000) / 100;
}
