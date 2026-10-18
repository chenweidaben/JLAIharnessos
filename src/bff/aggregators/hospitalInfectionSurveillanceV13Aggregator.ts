/**
 * 健澜科技 jlmedaios - 院感监测管理 V13 纯函数（M441-A，医院感染管理组）
 *
 * computeHospitalInfectionRateV13 / computeHospitalInfectionMissReportRateV13 / computeHospitalInfectionTargetedMonitoringRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感监测管理记录 */
export interface HospitalInfectionSurveillanceRecordV13 {
  hospitalInfectionCount: number;
  totalInpatient: number;
  missReportCount: number;
  totalInfection: number;
  targetedMonitoringDept: number;
  shouldMonitorDept: number;
}

/**
 * 院感发生率（纯函数，反向指标，越低越好）：院感发生例数/住院总人数×100，保留 2 位小数。
 *
 * @param records 院感监测管理记录列表
 * @returns 院感发生率百分比
 */
export function computeHospitalInfectionRateV13(records: HospitalInfectionSurveillanceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalInpatient, 0);
  if (total === 0) return 0;
  const infection = records.reduce((acc, r) => acc + r.hospitalInfectionCount, 0);
  return Math.round((infection / total) * 10000) / 100;
}

/**
 * 院感漏报率（纯函数，反向指标，越低越好）：漏报院感例数/院感总例数×100，保留 2 位小数。
 *
 * @param records 院感监测管理记录列表
 * @returns 院感漏报率百分比
 */
export function computeHospitalInfectionMissReportRateV13(records: HospitalInfectionSurveillanceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalInfection, 0);
  if (total === 0) return 0;
  const miss = records.reduce((acc, r) => acc + r.missReportCount, 0);
  return Math.round((miss / total) * 10000) / 100;
}

/**
 * 目标性监测覆盖率（纯函数）：已开展目标性监测科室数/应监测科室总数×100，保留 2 位小数。
 *
 * @param records 院感监测管理记录列表
 * @returns 目标性监测覆盖率百分比
 */
export function computeHospitalInfectionTargetedMonitoringRateV13(records: HospitalInfectionSurveillanceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldMonitorDept, 0);
  if (total === 0) return 0;
  const targeted = records.reduce((acc, r) => acc + r.targetedMonitoringDept, 0);
  return Math.round((targeted / total) * 10000) / 100;
}
