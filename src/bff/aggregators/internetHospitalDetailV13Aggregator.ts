/**
 * 健澜科技 jlmedaios - 互联网医院明细 V13 纯函数（M399-A，避让旧版 internetHospital/internetHospitalStatsV13）
 *
 * computeOnlineConsultationCountV13 / computeOnlinePrescriptionCountV13 / computeFollowupVisitRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 互联网医院明细记录 */
export interface InternetHospitalDetailRecordV13 {
  consultationCount: number;
  prescriptionCount: number;
  followupCount: number;
}

/**
 * 在线问诊数（纯函数）：求和。
 *
 * @param records 互联网医院明细记录列表
 * @returns 在线问诊数
 */
export function computeOnlineConsultationCountV13(records: InternetHospitalDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.consultationCount, 0);
}

/**
 * 在线处方数（纯函数）：求和。
 *
 * @param records 互联网医院明细记录列表
 * @returns 在线处方数
 */
export function computeOnlinePrescriptionCountV13(records: InternetHospitalDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.prescriptionCount, 0);
}

/**
 * 复诊率（纯函数）：复诊人数/在线问诊总人数×100，保留 2 位小数。
 *
 * @param records 互联网医院明细记录列表
 * @returns 复诊率百分比
 */
export function computeFollowupVisitRateV13(records: InternetHospitalDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.consultationCount, 0);
  if (total === 0) return 0;
  const followup = records.reduce((acc, r) => acc + r.followupCount, 0);
  return Math.round((followup / total) * 10000) / 100;
}
