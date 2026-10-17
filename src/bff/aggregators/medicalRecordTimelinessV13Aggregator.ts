/**
 * 健澜科技 jlmedaios - 病历书写及时性 V13 纯函数（M318-A）
 *
 * computeAdmissionRecordRateV13 / computeFirstProgressRateV13 / flagOverdueRecordsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病历记录 */
export interface MedicalRecordV13 {
  recordId: string;
  doctorId: string;
  admissionRecordHours: number;
  firstProgressHours: number;
}

/** 超时记录 */
export interface OverdueRecordV13 {
  recordId: string;
  doctorId: string;
  overdueItems: string[];
}

/**
 * 入院记录 24h 达标率（纯函数）：24h 内完成数/总入院记录数×100。
 *
 * @param records 病历列表
 * @returns 达标率百分比
 */
export function computeAdmissionRecordRateV13(records: MedicalRecordV13[]): number {
  if (records.length === 0) return 0;
  const pass = records.filter((r) => r.admissionRecordHours <= 24).length;
  return Math.round((pass / records.length) * 100);
}

/**
 * 首次病程 8h 达标率（纯函数）：8h 内完成数/总数×100。
 *
 * @param records 病历列表
 * @returns 达标率百分比
 */
export function computeFirstProgressRateV13(records: MedicalRecordV13[]): number {
  if (records.length === 0) return 0;
  const pass = records.filter((r) => r.firstProgressHours <= 8).length;
  return Math.round((pass / records.length) * 100);
}

/**
 * 超时记录红牌（纯函数）：超时限未完成 → 红牌列表。
 *
 * @param records 病历列表
 * @returns 超时记录列表
 */
export function flagOverdueRecordsV13(records: MedicalRecordV13[]): OverdueRecordV13[] {
  const result: OverdueRecordV13[] = [];
  for (const r of records) {
    const overdueItems: string[] = [];
    if (r.admissionRecordHours > 24) overdueItems.push("admissionRecord");
    if (r.firstProgressHours > 8) overdueItems.push("firstProgress");
    if (overdueItems.length > 0) {
      result.push({ recordId: r.recordId, doctorId: r.doctorId, overdueItems });
    }
  }
  return result;
}
