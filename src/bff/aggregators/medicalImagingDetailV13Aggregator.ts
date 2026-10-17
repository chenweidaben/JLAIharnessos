/**
 * 健澜科技 jlmedaios - 医学影像管理（细节）V13 纯函数（M415-B，detail 避让旧版 imagingTurnaroundV13）
 *
 * computeImagingReportDiagnosisMatchRateV13 / computeImagingEquipmentUptimeRateV13 / computeImagingDataArchivingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医学影像管理（细节）记录 */
export interface MedicalImagingDetailRecordV13 {
  match: number;
  reportTotal: number;
  uptime: number;
  shouldUptimeTotal: number;
  archived: number;
  shouldArchiveTotal: number;
}

/**
 * 影像报告诊断符合率（纯函数）：符合份数/报告总数×100，保留 2 位小数。
 *
 * @param records 医学影像管理（细节）记录列表
 * @returns 影像报告诊断符合率百分比
 */
export function computeImagingReportDiagnosisMatchRateV13(records: MedicalImagingDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotal, 0);
  if (total === 0) return 0;
  const match = records.reduce((acc, r) => acc + r.match, 0);
  return Math.round((match / total) * 10000) / 100;
}

/**
 * 影像设备开机率（纯函数）：开机时长/应开机时长×100，保留 2 位小数。
 *
 * @param records 医学影像管理（细节）记录列表
 * @returns 影像设备开机率百分比
 */
export function computeImagingEquipmentUptimeRateV13(records: MedicalImagingDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldUptimeTotal, 0);
  if (total === 0) return 0;
  const uptime = records.reduce((acc, r) => acc + r.uptime, 0);
  return Math.round((uptime / total) * 10000) / 100;
}

/**
 * 影像资料归档率（纯函数）：已归档份数/应归档总数×100，保留 2 位小数。
 *
 * @param records 医学影像管理（细节）记录列表
 * @returns 影像资料归档率百分比
 */
export function computeImagingDataArchivingRateV13(records: MedicalImagingDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldArchiveTotal, 0);
  if (total === 0) return 0;
  const archived = records.reduce((acc, r) => acc + r.archived, 0);
  return Math.round((archived / total) * 10000) / 100;
}
