/**
 * 健澜科技 jlmedaios - 费用控制 V13 纯函数（M375-B）
 *
 * computeOutpatientCostPerVisitV13 / computeInpatientCostPerStayV13 / computeDrugRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 费用控制记录 */
export interface MedicalCostControlRecordV13 {
  outpatientCostPerVisit: number;
  inpatientCostPerStay: number;
  drugRevenue: number;
  medicalRevenue: number;
}

/**
 * 次均门诊费用（纯函数）：均值，单位元，保留 2 位小数。
 *
 * @param records 费用控制记录列表
 * @returns 次均门诊费用（元）
 */
export function computeOutpatientCostPerVisitV13(records: MedicalCostControlRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.outpatientCostPerVisit, 0);
  return Math.round((total / records.length) * 100) / 100;
}

/**
 * 次均住院费用（纯函数）：均值，单位元，保留 2 位小数。
 *
 * @param records 费用控制记录列表
 * @returns 次均住院费用（元）
 */
export function computeInpatientCostPerStayV13(records: MedicalCostControlRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.inpatientCostPerStay, 0);
  return Math.round((total / records.length) * 100) / 100;
}

/**
 * 药占比（纯函数）：药品收入/医疗收入×100，保留 2 位小数。
 *
 * @param records 费用控制记录列表
 * @returns 药占比百分比
 */
export function computeDrugRatioV13(records: MedicalCostControlRecordV13[]): number {
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (medical === 0) return 0;
  const drug = records.reduce((acc, r) => acc + r.drugRevenue, 0);
  return Math.round((drug / medical) * 10000) / 100;
}
