/**
 * 健澜科技 jlmedaios - 手卫生明细 V13 纯函数（M393-A，避让旧版 handHygieneV13）
 *
 * computeHandHygieneComplianceRateV13 / computeHandHygieneCorrectRateV13 / computeHandHygieneConsumableUsageV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手卫生明细记录 */
export interface HandHygieneDetailRecordV13 {
  compliantCount: number;
  shouldCount: number;
  correctCount: number;
  executionCount: number;
  usageMlCount: number;
}

/**
 * 手卫生依从率（纯函数）：依从次数/应执行次数×100，保留 2 位小数。
 *
 * @param records 手卫生明细记录列表
 * @returns 手卫生依从率百分比
 */
export function computeHandHygieneComplianceRateV13(records: HandHygieneDetailRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantCount, 0);
  return Math.round((compliant / should) * 10000) / 100;
}

/**
 * 手卫生正确率（纯函数）：正确次数/执行次数×100，保留 2 位小数。
 *
 * @param records 手卫生明细记录列表
 * @returns 手卫生正确率百分比
 */
export function computeHandHygieneCorrectRateV13(records: HandHygieneDetailRecordV13[]): number {
  const execution = records.reduce((acc, r) => acc + r.executionCount, 0);
  if (execution === 0) return 0;
  const correct = records.reduce((acc, r) => acc + r.correctCount, 0);
  return Math.round((correct / execution) * 10000) / 100;
}

/**
 * 手卫生用品消耗量（纯函数）：求和，单位 ml。
 *
 * @param records 手卫生明细记录列表
 * @returns 手卫生用品消耗量（ml）
 */
export function computeHandHygieneConsumableUsageV13(records: HandHygieneDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.usageMlCount, 0);
}
