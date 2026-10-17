/**
 * 健澜科技 jlmedaios - 药学服务 V13 纯函数（M359-A）
 *
 * computeOutpatientPrescriptionPassRateV13 / computeInpatientOrderPassRateV13 / computeClinicalPharmacistRoundRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药学服务记录 */
export interface PharmacyServiceRecordV13 {
  outpatientPrescriptionPassed: number;
  outpatientPrescriptionCount: number;
  inpatientOrderPassed: number;
  inpatientOrderCount: number;
  clinicalPharmacistRounds: number;
  shouldRounds: number;
}

/**
 * 门诊处方合格率（纯函数）：合格数/处方数×100，保留 2 位小数。
 *
 * @param records 药学服务记录列表
 * @returns 门诊处方合格率百分比
 */
export function computeOutpatientPrescriptionPassRateV13(records: PharmacyServiceRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.outpatientPrescriptionPassed, 0);
  const total = records.reduce((acc, r) => acc + r.outpatientPrescriptionCount, 0);
  if (total === 0) return 0;
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 住院医嘱合格率（纯函数）：合格数/医嘱数×100，保留 2 位小数。
 *
 * @param records 药学服务记录列表
 * @returns 住院医嘱合格率百分比
 */
export function computeInpatientOrderPassRateV13(records: PharmacyServiceRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.inpatientOrderPassed, 0);
  const total = records.reduce((acc, r) => acc + r.inpatientOrderCount, 0);
  if (total === 0) return 0;
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 临床药师参与查房率（纯函数）：参与查房数/应查房数×100，保留 2 位小数。
 *
 * @param records 药学服务记录列表
 * @returns 临床药师参与查房率百分比
 */
export function computeClinicalPharmacistRoundRateV13(records: PharmacyServiceRecordV13[]): number {
  const rounds = records.reduce((acc, r) => acc + r.clinicalPharmacistRounds, 0);
  const should = records.reduce((acc, r) => acc + r.shouldRounds, 0);
  if (should === 0) return 0;
  return Math.round((rounds / should) * 10000) / 100;
}
