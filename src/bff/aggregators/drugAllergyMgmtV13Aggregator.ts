/**
 * 健澜科技 jlmedaios - 药品过敏管理 V13 纯函数（M388-C）
 *
 * computeAllergyHistoryRegistrationRateV13 / computeSkinTestExecutionRateV13 / computeAllergyReactionHandlingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品过敏管理记录 */
export interface DrugAllergyMgmtRecordV13 {
  registeredCount: number;
  shouldRegisterCount: number;
  executedCount: number;
  shouldExecuteCount: number;
  handledCount: number;
  reactionCount: number;
}

/**
 * 过敏史登记率（纯函数）：已登记数/应登记数×100，保留 2 位小数。
 *
 * @param records 药品过敏管理记录列表
 * @returns 过敏史登记率百分比
 */
export function computeAllergyHistoryRegistrationRateV13(records: DrugAllergyMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldRegisterCount, 0);
  if (should === 0) return 0;
  const registered = records.reduce((acc, r) => acc + r.registeredCount, 0);
  return Math.round((registered / should) * 10000) / 100;
}

/**
 * 皮试执行率（纯函数）：已执行数/应执行数×100，保留 2 位小数。
 *
 * @param records 药品过敏管理记录列表
 * @returns 皮试执行率百分比
 */
export function computeSkinTestExecutionRateV13(records: DrugAllergyMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldExecuteCount, 0);
  if (should === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executedCount, 0);
  return Math.round((executed / should) * 10000) / 100;
}

/**
 * 过敏反应处置率（纯函数）：已处置数/发生反应数×100，保留 2 位小数。
 *
 * @param records 药品过敏管理记录列表
 * @returns 过敏反应处置率百分比
 */
export function computeAllergyReactionHandlingRateV13(records: DrugAllergyMgmtRecordV13[]): number {
  const reactions = records.reduce((acc, r) => acc + r.reactionCount, 0);
  if (reactions === 0) return 0;
  const handled = records.reduce((acc, r) => acc + r.handledCount, 0);
  return Math.round((handled / reactions) * 10000) / 100;
}
