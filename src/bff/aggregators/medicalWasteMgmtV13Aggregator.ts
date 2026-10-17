/**
 * 健澜科技 jlmedaios - 医疗废物 V13 纯函数（M393-C）
 *
 * computeMedicalWasteClassificationRateV13 / computeHandoverRegistrationRateV13 / computeTemporaryStorageDisinfectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗废物记录 */
export interface MedicalWasteMgmtRecordV13 {
  correctCount: number;
  totalCount: number;
  registeredCount: number;
  registeredShouldCount: number;
  disinfectedCount: number;
  disinfectedShouldCount: number;
}

/**
 * 医疗废物分类率（纯函数）：正确分类数/分类总数×100，保留 2 位小数。
 *
 * @param records 医疗废物记录列表
 * @returns 医疗废物分类率百分比
 */
export function computeMedicalWasteClassificationRateV13(records: MedicalWasteMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const correct = records.reduce((acc, r) => acc + r.correctCount, 0);
  return Math.round((correct / total) * 10000) / 100;
}

/**
 * 交接登记率（纯函数）：已登记数/应登记数×100，保留 2 位小数。
 *
 * @param records 医疗废物记录列表
 * @returns 交接登记率百分比
 */
export function computeHandoverRegistrationRateV13(records: MedicalWasteMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.registeredShouldCount, 0);
  if (should === 0) return 0;
  const registered = records.reduce((acc, r) => acc + r.registeredCount, 0);
  return Math.round((registered / should) * 10000) / 100;
}

/**
 * 暂存点消毒率（纯函数）：已消毒次数/应消毒次数×100，保留 2 位小数。
 *
 * @param records 医疗废物记录列表
 * @returns 暂存点消毒率百分比
 */
export function computeTemporaryStorageDisinfectionRateV13(records: MedicalWasteMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.disinfectedShouldCount, 0);
  if (should === 0) return 0;
  const disinfected = records.reduce((acc, r) => acc + r.disinfectedCount, 0);
  return Math.round((disinfected / should) * 10000) / 100;
}
