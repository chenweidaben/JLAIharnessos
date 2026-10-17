/**
 * 健澜科技 jlmedaios - 健康教育管理 V13 纯函数（M420-B）
 *
 * computeHealthEducationPrescriptionIssueRateV13 / computeHealthLectureSessionCountV13 / computeHealthConsultationCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健康教育管理记录 */
export interface HealthEducationMgmtRecordV13 {
  prescriptionIssued: number;
  prescriptionShouldIssue: number;
  lectureSessions: number;
  consultationCovered: number;
  consultationShouldCover: number;
}

/**
 * 健康教育处方发放率（纯函数）：发放处方数/应发放处方总数×100，保留 2 位小数。
 *
 * @param records 健康教育管理记录列表
 * @returns 健康教育处方发放率百分比
 */
export function computeHealthEducationPrescriptionIssueRateV13(records: HealthEducationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.prescriptionShouldIssue, 0);
  if (total === 0) return 0;
  const prescriptionIssued = records.reduce((acc, r) => acc + r.prescriptionIssued, 0);
  return Math.round((prescriptionIssued / total) * 10000) / 100;
}

/**
 * 健康讲座场次（纯函数）：累计讲座场次求和，返回整数。
 *
 * @param records 健康教育管理记录列表
 * @returns 健康讲座场次（整数）
 */
export function computeHealthLectureSessionCountV13(records: HealthEducationMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.lectureSessions, 0);
}

/**
 * 健康咨询覆盖率（纯函数）：咨询覆盖人数/应覆盖总人数×100，保留 2 位小数。
 *
 * @param records 健康教育管理记录列表
 * @returns 健康咨询覆盖率百分比
 */
export function computeHealthConsultationCoverageRateV13(records: HealthEducationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.consultationShouldCover, 0);
  if (total === 0) return 0;
  const consultationCovered = records.reduce((acc, r) => acc + r.consultationCovered, 0);
  return Math.round((consultationCovered / total) * 10000) / 100;
}
