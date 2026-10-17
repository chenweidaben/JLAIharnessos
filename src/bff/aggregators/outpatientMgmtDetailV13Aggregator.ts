/**
 * 健澜科技 jlmedaios - 门诊管理（细节）V13 纯函数（M416-C，detail 避让旧版 outpatientWait/appointment/referral/chronicDisease）
 *
 * computeOutpatientPrescriptionPassRateV13 / computeOutpatientMedicalRecordPassRateV13 / computeOutpatientComplaintRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊管理（细节）记录 */
export interface OutpatientMgmtDetailRecordV13 {
  prescriptionQualified: number;
  prescriptionTotal: number;
  recordQualified: number;
  outpatientRecordTotal: number;
  complaint: number;
  outpatientVisitTotal: number;
}

/**
 * 门诊处方合格率（纯函数）：合格处方数/门诊处方总数×100，保留 2 位小数。
 *
 * @param records 门诊管理（细节）记录列表
 * @returns 门诊处方合格率百分比
 */
export function computeOutpatientPrescriptionPassRateV13(records: OutpatientMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.prescriptionTotal, 0);
  if (total === 0) return 0;
  const prescriptionQualified = records.reduce((acc, r) => acc + r.prescriptionQualified, 0);
  return Math.round((prescriptionQualified / total) * 10000) / 100;
}

/**
 * 门诊病历合格率（纯函数）：合格病历数/门诊病历总数×100，保留 2 位小数。
 *
 * @param records 门诊管理（细节）记录列表
 * @returns 门诊病历合格率百分比
 */
export function computeOutpatientMedicalRecordPassRateV13(records: OutpatientMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientRecordTotal, 0);
  if (total === 0) return 0;
  const recordQualified = records.reduce((acc, r) => acc + r.recordQualified, 0);
  return Math.round((recordQualified / total) * 10000) / 100;
}

/**
 * 门诊患者投诉率（纯函数，反向指标，值越低越好）：投诉例数/门诊总人次×100，保留 2 位小数。
 *
 * @param records 门诊管理（细节）记录列表
 * @returns 门诊患者投诉率百分比
 */
export function computeOutpatientComplaintRateV13(records: OutpatientMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientVisitTotal, 0);
  if (total === 0) return 0;
  const complaint = records.reduce((acc, r) => acc + r.complaint, 0);
  return Math.round((complaint / total) * 10000) / 100;
}
