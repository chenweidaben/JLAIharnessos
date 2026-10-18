/**
 * 健澜科技 jlmedaios - 互联网医院管理 V13 纯函数（M459-C，医院运营与健康管理组）
 *
 * 备注：M455 曾派此名但中途改规格为药品供应，旧文件已物理删除回滚；本切片按新规格重新落盘。
 *
 * computeInternetHospitalOnlineConsultationCountV13 / computeInternetHospitalOnlinePrescriptionRateV13 / computeInternetHospitalReconsultationResponseMinutesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 互联网医院管理记录 */
export interface InternetHospitalMgmtRecordV13 {
  consultationCount: number;
  prescribed: number;
  totalConsultation: number;
  responseMinutes: number;
}

/**
 * 在线问诊量（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.consultationCount, 0)，直接返回计数。
 *
 * @param records 互联网医院管理记录列表
 * @returns 在线问诊总数量（人次）
 */
export function computeInternetHospitalOnlineConsultationCountV13(records: InternetHospitalMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.consultationCount, 0);
}

/**
 * 在线处方率（纯函数）：在线处方数/在线问诊总数×100，保留 2 位小数。
 *
 * @param records 互联网医院管理记录列表
 * @returns 在线处方率百分比
 */
export function computeInternetHospitalOnlinePrescriptionRateV13(records: InternetHospitalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalConsultation, 0);
  if (total === 0) return 0;
  const prescribed = records.reduce((acc, r) => acc + r.prescribed, 0);
  return Math.round((prescribed / total) * 10000) / 100;
}

/**
 * 复诊咨询响应时长（纯函数）：records.reduce((acc, r) => acc + r.responseMinutes, 0) / records.length，Math.ceil(avg) 直接向上取整到整分钟。
 *
 * @param records 互联网医院管理记录列表
 * @returns 复诊咨询响应时长（分钟，整分钟）
 */
export function computeInternetHospitalReconsultationResponseMinutesV13(records: InternetHospitalMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.responseMinutes, 0);
  return Math.ceil(sum / records.length);
}
