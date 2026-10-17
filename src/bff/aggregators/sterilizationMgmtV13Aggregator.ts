/**
 * 健澜科技 jlmedaios - 消毒灭菌管理 V13 纯函数（M423-C）
 *
 * computeSterilizationPassRateV13 / computeDisinfectionEffectMonitoringPassRateV13 / computeSterileStorageComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 消毒灭菌管理记录 */
export interface SterilizationMgmtRecordV13 {
  passBatch: number;
  totalBatch: number;
  passMonitor: number;
  totalMonitor: number;
  compliantPoint: number;
  totalPoint: number;
}

/**
 * 灭菌合格率（纯函数）：合格灭菌批次/灭菌总批次×100，保留 2 位小数。
 *
 * @param records 消毒灭菌管理记录列表
 * @returns 灭菌合格率百分比
 */
export function computeSterilizationPassRateV13(records: SterilizationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBatch, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.passBatch, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 消毒效果监测合格率（纯函数）：合格监测数/监测总数×100，保留 2 位小数。
 *
 * @param records 消毒灭菌管理记录列表
 * @returns 消毒效果监测合格率百分比
 */
export function computeDisinfectionEffectMonitoringPassRateV13(records: SterilizationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMonitor, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.passMonitor, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 无菌物品存放合规率（纯函数）：合规存放点数/存放点总数×100，保留 2 位小数。
 *
 * @param records 消毒灭菌管理记录列表
 * @returns 无菌物品存放合规率百分比
 */
export function computeSterileStorageComplianceRateV13(records: SterilizationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPoint, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantPoint, 0);
  return Math.round((compliant / total) * 10000) / 100;
}
