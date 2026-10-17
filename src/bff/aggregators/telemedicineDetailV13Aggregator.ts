/**
 * 健澜科技 jlmedaios - 远程医疗明细 V13 纯函数（M399-B，避让旧版 telemedicineV13/telemedicineStatsV13）
 *
 * computeRemoteConsultationCountV13 / computeRemoteImagingDiagnosisCountV13 / computeRemoteOutpatientCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 远程医疗明细记录 */
export interface TelemedicineDetailRecordV13 {
  consultationCount: number;
  imagingCount: number;
  outpatientCount: number;
}

/**
 * 远程会诊数（纯函数）：求和。
 *
 * @param records 远程医疗明细记录列表
 * @returns 远程会诊数
 */
export function computeRemoteConsultationCountV13(records: TelemedicineDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.consultationCount, 0);
}

/**
 * 远程影像诊断数（纯函数）：求和。
 *
 * @param records 远程医疗明细记录列表
 * @returns 远程影像诊断数
 */
export function computeRemoteImagingDiagnosisCountV13(records: TelemedicineDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.imagingCount, 0);
}

/**
 * 远程门诊数（纯函数）：求和。
 *
 * @param records 远程医疗明细记录列表
 * @returns 远程门诊数
 */
export function computeRemoteOutpatientCountV13(records: TelemedicineDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outpatientCount, 0);
}
