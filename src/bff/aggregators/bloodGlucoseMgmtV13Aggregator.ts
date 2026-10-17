/**
 * 健澜科技 jlmedaios - 血糖管理 V13 纯函数（M424-D，M424 收官）
 *
 * computeBloodGlucoseMonitoringComplianceRateV13 / computeBloodGlucoseTargetAchieveRateV13 / computeHypoglycemiaOccurrenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 血糖管理记录 */
export interface BloodGlucoseMgmtRecordV13 {
  compliantMon: number;
  shouldMon: number;
  targetAchieved: number;
  monitoredPatients: number;
  hypoOccurred: number;
  totalMon: number;
}

/**
 * 血糖监测规范率（纯函数）：规范监测次数/应监测次数×100，保留 2 位小数。
 *
 * @param records 血糖管理记录列表
 * @returns 血糖监测规范率百分比
 */
export function computeBloodGlucoseMonitoringComplianceRateV13(records: BloodGlucoseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldMon, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantMon, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 血糖达标率（纯函数）：达标患者数/监测患者总数×100，保留 2 位小数。
 *
 * @param records 血糖管理记录列表
 * @returns 血糖达标率百分比
 */
export function computeBloodGlucoseTargetAchieveRateV13(records: BloodGlucoseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.monitoredPatients, 0);
  if (total === 0) return 0;
  const achieved = records.reduce((acc, r) => acc + r.targetAchieved, 0);
  return Math.round((achieved / total) * 10000) / 100;
}

/**
 * 低血糖发生率（纯函数，反向指标，值越低越好）：发生低血糖次数/监测总次数×100，保留 2 位小数。
 *
 * @param records 血糖管理记录列表
 * @returns 低血糖发生率百分比
 */
export function computeHypoglycemiaOccurrenceRateV13(records: BloodGlucoseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMon, 0);
  if (total === 0) return 0;
  const hypo = records.reduce((acc, r) => acc + r.hypoOccurred, 0);
  return Math.round((hypo / total) * 10000) / 100;
}
