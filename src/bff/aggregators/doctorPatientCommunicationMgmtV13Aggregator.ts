/**
 * 健澜科技 jlmedaios - 医患沟通管理 V13 纯函数（M451-A，医患关系与投诉管理组）
 *
 * computeDoctorPatientCommunicationRecordCompletenessRateV13 / computeDoctorPatientCommunicationInformedConsentSignRateV13 / computeDoctorPatientCommunicationComplaintOccurrenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医患沟通管理记录 */
export interface DoctorPatientCommunicationMgmtRecordV13 {
  complete: number;
  totalRecord: number;
  signed: number;
  shouldSign: number;
  complaint: number;
  totalCommunication: number;
}

/**
 * 沟通记录完整率（纯函数）：完整沟通记录数/沟通记录总数×100，保留 2 位小数。
 *
 * @param records 医患沟通管理记录列表
 * @returns 沟通记录完整率百分比
 */
export function computeDoctorPatientCommunicationRecordCompletenessRateV13(records: DoctorPatientCommunicationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecord, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 知情同意书签署率（纯函数）：已签署知情同意书数/应签署总数×100，保留 2 位小数。
 *
 * @param records 医患沟通管理记录列表
 * @returns 知情同意书签署率百分比
 */
export function computeDoctorPatientCommunicationInformedConsentSignRateV13(records: DoctorPatientCommunicationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldSign, 0);
  if (total === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.signed, 0);
  return Math.round((signed / total) * 10000) / 100;
}

/**
 * 沟通投诉发生率（纯函数，反向指标越低越好）：沟通投诉数/医患沟通总次数×100，保留 2 位小数。
 *
 * @param records 医患沟通管理记录列表
 * @returns 沟通投诉发生率百分比
 */
export function computeDoctorPatientCommunicationComplaintOccurrenceRateV13(records: DoctorPatientCommunicationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCommunication, 0);
  if (total === 0) return 0;
  const complaint = records.reduce((acc, r) => acc + r.complaint, 0);
  return Math.round((complaint / total) * 10000) / 100;
}
