/**
 * 健澜科技 jlmedaios - 患者流明细 V13 纯函数（M381-C）
 *
 * computeAvgWaitingHoursV13 / computeAvgLOSDaysV13 / computeBedTurnoverCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者流明细记录 */
export interface PatientFlowDetailRecordV13 {
  totalWaitingMinutes: number;
  patientCount: number;
  totalLOSDays: number;
  dischargeCount: number;
  avgOpenBedCount: number;
}

/**
 * 平均候诊时长（纯函数）：总候诊分钟数/患者数，保留 2 位小数，单位分钟。
 *
 * @param records 患者流明细记录列表
 * @returns 平均候诊时长（分钟）
 */
export function computeAvgWaitingHoursV13(records: PatientFlowDetailRecordV13[]): number {
  const patients = records.reduce((acc, r) => acc + r.patientCount, 0);
  if (patients === 0) return 0;
  const totalWaiting = records.reduce((acc, r) => acc + r.totalWaitingMinutes, 0);
  return Math.round((totalWaiting / patients) * 100) / 100;
}

/**
 * 平均住院日（纯函数）：总住院天数/出院人数，保留 2 位小数，单位天。
 *
 * @param records 患者流明细记录列表
 * @returns 平均住院日（天）
 */
export function computeAvgLOSDaysV13(records: PatientFlowDetailRecordV13[]): number {
  const discharges = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (discharges === 0) return 0;
  const totalLOS = records.reduce((acc, r) => acc + r.totalLOSDays, 0);
  return Math.round((totalLOS / discharges) * 100) / 100;
}

/**
 * 床位周转次数（纯函数）：出院人数/平均开放床位数，保留 2 位小数。
 *
 * @param records 患者流明细记录列表
 * @returns 床位周转次数
 */
export function computeBedTurnoverCountV13(records: PatientFlowDetailRecordV13[]): number {
  const beds = records.reduce((acc, r) => acc + r.avgOpenBedCount, 0);
  if (beds === 0) return 0;
  const discharges = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  return Math.round((discharges / beds) * 100) / 100;
}
