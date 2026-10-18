/**
 * 健澜科技 jlmedaios - 医保费用管控 V13 纯函数（M445-A，医保物价与费用管理组）
 *
 * computeInsuranceCostControlRateV13 / computeInsuranceCostRejectionRateV13 / computeInsuranceCostGrowthControlRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医保费用管控记录 */
export interface InsuranceCostControlRecordV13 {
  avgActualCost: number;
  avgTargetCost: number;
  rejectionAmount: number;
  settlementTotal: number;
  actualGrowth: number;
  targetGrowth: number;
}

/**
 * 医保次均费用控制率（纯函数，正向指标，越高越好）：(1 - 实际次均费用/控制目标次均费用)×100，保留 2 位小数。
 *
 * @param records 医保费用管控记录列表
 * @returns 医保次均费用控制率百分比
 */
export function computeInsuranceCostControlRateV13(records: InsuranceCostControlRecordV13[]): number {
  const totalActual = records.reduce((acc, r) => acc + r.avgActualCost, 0);
  const totalTarget = records.reduce((acc, r) => acc + r.avgTargetCost, 0);
  if (totalTarget === 0) return 0;
  return Math.round((1 - totalActual / totalTarget) * 10000) / 100;
}

/**
 * 医保拒付率（纯函数，反向指标，越低越好）：医保拒付金额/医保结算总金额×100，保留 2 位小数。
 *
 * @param records 医保费用管控记录列表
 * @returns 医保拒付率百分比
 */
export function computeInsuranceCostRejectionRateV13(records: InsuranceCostControlRecordV13[]): number {
  const totalSettlement = records.reduce((acc, r) => acc + r.settlementTotal, 0);
  if (totalSettlement === 0) return 0;
  const totalRejection = records.reduce((acc, r) => acc + r.rejectionAmount, 0);
  return Math.round((totalRejection / totalSettlement) * 10000) / 100;
}

/**
 * 医保费用增幅控制率（纯函数，正向指标，越高越好）：(1 - 实际增幅/控制目标增幅)×100，保留 2 位小数。
 *
 * @param records 医保费用管控记录列表
 * @returns 医保费用增幅控制率百分比
 */
export function computeInsuranceCostGrowthControlRateV13(records: InsuranceCostControlRecordV13[]): number {
  const totalActualGrowth = records.reduce((acc, r) => acc + r.actualGrowth, 0);
  const totalTargetGrowth = records.reduce((acc, r) => acc + r.targetGrowth, 0);
  if (totalTargetGrowth === 0) return 0;
  return Math.round((1 - totalActualGrowth / totalTargetGrowth) * 10000) / 100;
}
