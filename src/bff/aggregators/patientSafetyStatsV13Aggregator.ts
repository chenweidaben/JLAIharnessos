/**
 * 健澜科技 jlmedaios - 患者安全目标 V13 纯函数（M357-A，stats 避让已有 patientSafetyV13 / M322-B）
 *
 * computeAdverseEventReportRateV13 / computeNosocomialPressureUlcerRateV13 / computeNosocomialFallRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者安全目标记录 */
export interface PatientSafetyStatsRecordV13 {
  adverseEventReported: number;
  dischargedPatients: number;
  pressureUlcerOccurred: number;
  inpatientAdmissions: number;
  fallOccurred: number;
}

/**
 * 不良事件上报率（纯函数）：上报数/出院数×100，保留 2 位小数。
 *
 * @param records 患者安全目标记录列表
 * @returns 不良事件上报率百分比
 */
export function computeAdverseEventReportRateV13(records: PatientSafetyStatsRecordV13[]): number {
  const reported = records.reduce((acc, r) => acc + r.adverseEventReported, 0);
  const discharged = records.reduce((acc, r) => acc + r.dischargedPatients, 0);
  if (discharged === 0) return 0;
  return Math.round((reported / discharged) * 10000) / 100;
}

/**
 * 院内压疮发生率（纯函数）：发生数/住院数×100，保留 2 位小数。
 *
 * @param records 患者安全目标记录列表
 * @returns 院内压疮发生率百分比
 */
export function computeNosocomialPressureUlcerRateV13(records: PatientSafetyStatsRecordV13[]): number {
  const occurred = records.reduce((acc, r) => acc + r.pressureUlcerOccurred, 0);
  const admissions = records.reduce((acc, r) => acc + r.inpatientAdmissions, 0);
  if (admissions === 0) return 0;
  return Math.round((occurred / admissions) * 10000) / 100;
}

/**
 * 院内跌倒发生率（纯函数）：发生数/住院数×100，保留 2 位小数。
 *
 * @param records 患者安全目标记录列表
 * @returns 院内跌倒发生率百分比
 */
export function computeNosocomialFallRateV13(records: PatientSafetyStatsRecordV13[]): number {
  const occurred = records.reduce((acc, r) => acc + r.fallOccurred, 0);
  const admissions = records.reduce((acc, r) => acc + r.inpatientAdmissions, 0);
  if (admissions === 0) return 0;
  return Math.round((occurred / admissions) * 10000) / 100;
}
