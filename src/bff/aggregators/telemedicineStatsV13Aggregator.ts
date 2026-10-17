/**
 * 健澜科技 jlmedaios - 远程医疗（统计）V13 纯函数（M367-B，stats避让）
 *
 * computeRemoteConsultationCountV13 / computeRemoteImagingDiagnosisCountV13 / computeRemoteTeachingCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 远程医疗（统计）记录 */
export interface TelemedicineStatsRecordV13 {
  remoteConsultationCount: number;
  remoteImagingDiagnosisCount: number;
  remoteTeachingCount: number;
}

/**
 * 远程会诊次数（纯函数）：求和。
 *
 * @param records 远程医疗记录列表
 * @returns 远程会诊次数
 */
export function computeRemoteConsultationCountV13(records: TelemedicineStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.remoteConsultationCount, 0);
}

/**
 * 远程影像诊断数（纯函数）：求和。
 *
 * @param records 远程医疗记录列表
 * @returns 远程影像诊断数
 */
export function computeRemoteImagingDiagnosisCountV13(records: TelemedicineStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.remoteImagingDiagnosisCount, 0);
}

/**
 * 远程教学次数（纯函数）：求和。
 *
 * @param records 远程医疗记录列表
 * @returns 远程教学次数
 */
export function computeRemoteTeachingCountV13(records: TelemedicineStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.remoteTeachingCount, 0);
}
