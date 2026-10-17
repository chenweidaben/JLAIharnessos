/**
 * 健澜科技 jlmedaios - 互联网医院（统计）V13 纯函数（M367-A，stats避让）
 *
 * computeOnlineConsultationCountV13 / computeOnlinePrescriptionCountV13 / computeOnlineFollowUpCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 互联网医院（统计）记录 */
export interface InternetHospitalStatsRecordV13 {
  onlineConsultationCount: number;
  onlinePrescriptionCount: number;
  onlineFollowUpCount: number;
}

/**
 * 在线问诊人次（纯函数）：求和。
 *
 * @param records 互联网医院记录列表
 * @returns 在线问诊人次
 */
export function computeOnlineConsultationCountV13(records: InternetHospitalStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.onlineConsultationCount, 0);
}

/**
 * 在线处方数（纯函数）：求和。
 *
 * @param records 互联网医院记录列表
 * @returns 在线处方数
 */
export function computeOnlinePrescriptionCountV13(records: InternetHospitalStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.onlinePrescriptionCount, 0);
}

/**
 * 在线随访数（纯函数）：求和。
 *
 * @param records 互联网医院记录列表
 * @returns 在线随访数
 */
export function computeOnlineFollowUpCountV13(records: InternetHospitalStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.onlineFollowUpCount, 0);
}
