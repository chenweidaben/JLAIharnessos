/**
 * 健澜科技 jlmedaios - 会诊管理 V13 纯函数（M404-B）
 *
 * computeGeneralConsultationTimelyRateV13 / computeEmergencyConsultationArrivalTimeV13 / computeConsultationOpinionExecutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 会诊管理记录 */
export interface ConsultationMgmtRecordV13 {
  timelyGeneral: number;
  totalGeneral: number;
  emergencyArrival: number;
  executed: number;
  totalOpinion: number;
}

/**
 * 普通会诊及时率（纯函数）：及时会诊数/应会诊总数×100，保留 2 位小数。
 *
 * @param records 会诊管理记录列表
 * @returns 普通会诊及时率百分比
 */
export function computeGeneralConsultationTimelyRateV13(records: ConsultationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalGeneral, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyGeneral, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 急会诊到位时间（纯函数）：平均值，单位分钟，Math.ceil 向上取整到整分钟。
 *
 * @param records 会诊管理记录列表
 * @returns 急会诊到位时间（分钟）
 */
export function computeEmergencyConsultationArrivalTimeV13(records: ConsultationMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const avg = records.reduce((acc, r) => acc + r.emergencyArrival, 0) / records.length;
  return Math.ceil(avg);
}

/**
 * 会诊意见执行率（纯函数）：执行条数/会诊意见总条数×100，保留 2 位小数。
 *
 * @param records 会诊管理记录列表
 * @returns 会诊意见执行率百分比
 */
export function computeConsultationOpinionExecutionRateV13(records: ConsultationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalOpinion, 0);
  if (total === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executed, 0);
  return Math.round((executed / total) * 10000) / 100;
}
