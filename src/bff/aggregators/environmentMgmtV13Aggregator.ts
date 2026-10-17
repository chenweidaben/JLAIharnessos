/**
 * 健澜科技 jlmedaios - 环境管理 V13 纯函数（M377-D，M377 收官）
 *
 * computeMedicalWasteDisposalCountV13 / computeSewageTreatmentComplianceRateV13 / computeEnvironmentMonitoringPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 环境管理记录 */
export interface EnvironmentMgmtRecordV13 {
  medicalWasteCount: number;
  sewageTestCount: number;
  sewagePassCount: number;
  envMonitorCount: number;
  envMonitorPassCount: number;
}

/**
 * 医疗废物处置量（纯函数）：求和，单位吨。
 *
 * @param records 环境管理记录列表
 * @returns 医疗废物处置量
 */
export function computeMedicalWasteDisposalCountV13(records: EnvironmentMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.medicalWasteCount, 0);
}

/**
 * 污水处理达标率（纯函数）：达标次数/检测次数×100，保留 2 位小数。
 *
 * @param records 环境管理记录列表
 * @returns 污水处理达标率百分比
 */
export function computeSewageTreatmentComplianceRateV13(records: EnvironmentMgmtRecordV13[]): number {
  const test = records.reduce((acc, r) => acc + r.sewageTestCount, 0);
  if (test === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.sewagePassCount, 0);
  return Math.round((pass / test) * 10000) / 100;
}

/**
 * 环境监测合格率（纯函数）：合格数/监测数×100，保留 2 位小数。
 *
 * @param records 环境管理记录列表
 * @returns 环境监测合格率百分比
 */
export function computeEnvironmentMonitoringPassRateV13(records: EnvironmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.envMonitorCount, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.envMonitorPassCount, 0);
  return Math.round((pass / total) * 10000) / 100;
}
