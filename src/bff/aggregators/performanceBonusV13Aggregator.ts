/**
 * 健澜科技 jlmedaios - 绩效奖金 V13 纯函数（M410-C）
 *
 * computePerCapitaPerformanceBonusV13 / computePerformanceBonusRatioV13 / computeBonusDistributionFairnessScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绩效奖金记录 */
export interface PerformanceBonusRecordV13 {
  perCapitaBonus: number;
  bonusTotal: number;
  salaryTotal: number;
  fairnessScore: number;
}

/**
 * 人均绩效奖金（纯函数）：平均值，单位元，保留 2 位小数。
 *
 * @param records 绩效奖金记录列表
 * @returns 人均绩效奖金（元）
 */
export function computePerCapitaPerformanceBonusV13(records: PerformanceBonusRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.perCapitaBonus, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 绩效奖金占比（纯函数）：绩效奖金总额/工资总额×100，保留 2 位小数。
 *
 * @param records 绩效奖金记录列表
 * @returns 绩效奖金占比百分比
 */
export function computePerformanceBonusRatioV13(records: PerformanceBonusRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.salaryTotal, 0);
  if (total === 0) return 0;
  const bonus = records.reduce((acc, r) => acc + r.bonusTotal, 0);
  return Math.round((bonus / total) * 10000) / 100;
}

/**
 * 奖金分配公平性评分（纯函数）：平均值，保留 2 位小数。
 *
 * @param records 绩效奖金记录列表
 * @returns 奖金分配公平性评分（平均分）
 */
export function computeBonusDistributionFairnessScoreV13(records: PerformanceBonusRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.fairnessScore, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
