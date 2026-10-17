/**
 * 健澜科技 jlmedaios - 患者身份识别 V13 纯函数（M394-C）
 *
 * computePatientIdentificationCorrectRateV13 / computeWristbandWearingRateV13 / computeTransfusionDoubleCheckCorrectRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者身份识别记录 */
export interface PatientIdentificationRecordV13 {
  correctCount: number;
  totalCount: number;
  wristbandWornCount: number;
  wristbandShouldCount: number;
  transfusionCheckCorrectCount: number;
  transfusionTotalCount: number;
}

/**
 * 身份识别正确率（纯函数）：正确例数/核对总数×100，保留 2 位小数。
 *
 * @param records 患者身份识别记录列表
 * @returns 身份识别正确率百分比
 */
export function computePatientIdentificationCorrectRateV13(records: PatientIdentificationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const correct = records.reduce((acc, r) => acc + r.correctCount, 0);
  return Math.round((correct / total) * 10000) / 100;
}

/**
 * 腕带佩戴率（纯函数）：已佩戴人数/应佩戴人数×100，保留 2 位小数。
 *
 * @param records 患者身份识别记录列表
 * @returns 腕带佩戴率百分比
 */
export function computeWristbandWearingRateV13(records: PatientIdentificationRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.wristbandShouldCount, 0);
  if (should === 0) return 0;
  const worn = records.reduce((acc, r) => acc + r.wristbandWornCount, 0);
  return Math.round((worn / should) * 10000) / 100;
}

/**
 * 输血核对正确率（纯函数）：正确核对数/输血总例数×100，保留 2 位小数。
 *
 * @param records 患者身份识别记录列表
 * @returns 输血核对正确率百分比
 */
export function computeTransfusionDoubleCheckCorrectRateV13(records: PatientIdentificationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotalCount, 0);
  if (total === 0) return 0;
  const correct = records.reduce((acc, r) => acc + r.transfusionCheckCorrectCount, 0);
  return Math.round((correct / total) * 10000) / 100;
}
