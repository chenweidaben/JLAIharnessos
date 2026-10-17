/**
 * 健澜科技 jlmedaios - 分诊管理 V13 纯函数（M390-B）
 *
 * computeEmergencyTriageAccuracyRateV13 / computeWaitingTimeAvgV13 / computeLevel4AbovePatientRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 分诊管理记录 */
export interface TriageMgmtRecordV13 {
  accurateCount: number;
  totalTriageCount: number;
  totalWaitMinutes: number;
  patientCount: number;
  level4AboveCount: number;
  totalErCount: number;
}

/**
 * 急诊分诊准确率（纯函数）：准确例数/总分诊例数×100，保留 2 位小数。
 *
 * @param records 分诊管理记录列表
 * @returns 急诊分诊准确率百分比
 */
export function computeEmergencyTriageAccuracyRateV13(records: TriageMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTriageCount, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurateCount, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 候诊时长（纯函数）：所有患者候诊时长总和/患者总数，保留 2 位小数，分钟。
 *
 * @param records 分诊管理记录列表
 * @returns 平均候诊时长（分钟）
 */
export function computeWaitingTimeAvgV13(records: TriageMgmtRecordV13[]): number {
  const patients = records.reduce((acc, r) => acc + r.patientCount, 0);
  if (patients === 0) return 0;
  const totalWait = records.reduce((acc, r) => acc + r.totalWaitMinutes, 0);
  return Math.round((totalWait / patients) * 100) / 100;
}

/**
 * 四级以上患者占比（纯函数）：四级及以上患者数/急诊患者总数×100，保留 2 位小数。
 *
 * @param records 分诊管理记录列表
 * @returns 四级以上患者占比百分比
 */
export function computeLevel4AbovePatientRatioV13(records: TriageMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalErCount, 0);
  if (total === 0) return 0;
  const level4Above = records.reduce((acc, r) => acc + r.level4AboveCount, 0);
  return Math.round((level4Above / total) * 10000) / 100;
}
