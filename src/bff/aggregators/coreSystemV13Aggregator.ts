/**
 * 健澜科技 jlmedaios - 医疗质量核心制度 V13 纯函数（M357-B）
 *
 * computeThreeRoundRateV13 / computeDifficultCaseDiscussionRateV13 / computeDeathCaseDiscussionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗质量核心制度记录 */
export interface CoreSystemRecordV13 {
  threeRoundImplemented: number;
  threeRoundRequired: number;
  difficultCaseDiscussed: number;
  difficultCaseCount: number;
  deathCaseDiscussed: number;
  deathCaseCount: number;
}

/**
 * 三级查房落实率（纯函数）：落实数/应查数×100，保留 2 位小数。
 *
 * @param records 医疗质量核心制度记录列表
 * @returns 三级查房落实率百分比
 */
export function computeThreeRoundRateV13(records: CoreSystemRecordV13[]): number {
  const implemented = records.reduce((acc, r) => acc + r.threeRoundImplemented, 0);
  const required = records.reduce((acc, r) => acc + r.threeRoundRequired, 0);
  if (required === 0) return 0;
  return Math.round((implemented / required) * 10000) / 100;
}

/**
 * 疑难病例讨论率（纯函数）：讨论数/疑难病例数×100，保留 2 位小数。
 *
 * @param records 医疗质量核心制度记录列表
 * @returns 疑难病例讨论率百分比
 */
export function computeDifficultCaseDiscussionRateV13(records: CoreSystemRecordV13[]): number {
  const discussed = records.reduce((acc, r) => acc + r.difficultCaseDiscussed, 0);
  const total = records.reduce((acc, r) => acc + r.difficultCaseCount, 0);
  if (total === 0) return 0;
  return Math.round((discussed / total) * 10000) / 100;
}

/**
 * 死亡病例讨论率（纯函数）：讨论数/死亡数×100，保留 2 位小数。
 *
 * @param records 医疗质量核心制度记录列表
 * @returns 死亡病例讨论率百分比
 */
export function computeDeathCaseDiscussionRateV13(records: CoreSystemRecordV13[]): number {
  const discussed = records.reduce((acc, r) => acc + r.deathCaseDiscussed, 0);
  const total = records.reduce((acc, r) => acc + r.deathCaseCount, 0);
  if (total === 0) return 0;
  return Math.round((discussed / total) * 10000) / 100;
}
