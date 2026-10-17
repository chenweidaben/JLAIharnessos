/**
 * 健澜科技 jlmedaios - 院感监测（细节）V13 纯函数（M421-A，detail 避让旧版 infectionReportMgmtV13/infectionControlDetailV13 等院感系列）
 *
 * computeHospitalInfectionIncidenceRateV13 / computeHospitalInfectionMissingReportRateV13 / computeEnvironmentalHygieneMonitoringPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感监测（细节）记录 */
export interface InfectionSurveillanceDetailRecordV13 {
  infectionPatientCount: number;
  dischargePatientTotal: number;
  missingReport: number;
  shouldReport: number;
  envSampleQualified: number;
  envSampleTotal: number;
}

/**
 * 医院感染发病率（纯函数）：感染患者数/出院患者总数×100，保留 2 位小数。
 *
 * @param records 院感监测（细节）记录列表
 * @returns 医院感染发病率百分比
 */
export function computeHospitalInfectionIncidenceRateV13(records: InfectionSurveillanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargePatientTotal, 0);
  if (total === 0) return 0;
  const infectionPatientCount = records.reduce((acc, r) => acc + r.infectionPatientCount, 0);
  return Math.round((infectionPatientCount / total) * 10000) / 100;
}

/**
 * 医院感染漏报率（纯函数，反向指标，值越低越好）：漏报例数/应报例数×100，保留 2 位小数。
 *
 * @param records 院感监测（细节）记录列表
 * @returns 医院感染漏报率百分比
 */
export function computeHospitalInfectionMissingReportRateV13(records: InfectionSurveillanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldReport, 0);
  if (total === 0) return 0;
  const missingReport = records.reduce((acc, r) => acc + r.missingReport, 0);
  return Math.round((missingReport / total) * 10000) / 100;
}

/**
 * 环境卫生学监测合格率（纯函数）：合格采样数/采样总数×100，保留 2 位小数。
 *
 * @param records 院感监测（细节）记录列表
 * @returns 环境卫生学监测合格率百分比
 */
export function computeEnvironmentalHygieneMonitoringPassRateV13(records: InfectionSurveillanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.envSampleTotal, 0);
  if (total === 0) return 0;
  const envSampleQualified = records.reduce((acc, r) => acc + r.envSampleQualified, 0);
  return Math.round((envSampleQualified / total) * 10000) / 100;
}
