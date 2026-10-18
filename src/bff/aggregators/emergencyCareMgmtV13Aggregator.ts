/**
 * 健澜科技 jlmedaios - 急诊护理管理 V13 纯函数（M428-C，换名避让旧版 emergencyMgmtV13（M416，-care 后缀））
 *
 * computeEmergencyStayHoursV13 / computeEmergencyRescueSuccessRateV13 / computeEmergencyTriageAccuracyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊护理管理记录 */
export interface EmergencyCareMgmtRecordV13 {
  stayHours: number;
  rescueSuccess: number;
  rescueTotal: number;
  triageAccurate: number;
  triageTotal: number;
}

/**
 * 急诊滞留时间（纯函数）：平均值，单位小时，Math.ceil 整小时向上取整。
 *
 * @param records 急诊护理管理记录列表
 * @returns 急诊滞留时间平均值（整小时）
 */
export function computeEmergencyStayHoursV13(records: EmergencyCareMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.stayHours, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}

/**
 * 急诊抢救成功率（纯函数）：抢救成功数/抢救总数×100，保留 2 位小数。
 *
 * @param records 急诊护理管理记录列表
 * @returns 急诊抢救成功率百分比
 */
export function computeEmergencyRescueSuccessRateV13(records: EmergencyCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.rescueTotal, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.rescueSuccess, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * 急诊分诊准确率（纯函数）：准确分诊数/分诊总数×100，保留 2 位小数。
 *
 * @param records 急诊护理管理记录列表
 * @returns 急诊分诊准确率百分比
 */
export function computeEmergencyTriageAccuracyRateV13(records: EmergencyCareMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.triageTotal, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.triageAccurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}
