/**
 * 健澜科技 jlmedaios - 设备报废处置管理 V13 纯函数（M449-D，M449 收官，医疗装备与设备管理组）
 *
 * computeEquipmentDisposalAssessmentComplianceRateV13 / computeEquipmentDisposalTimelinessRateV13 / computeEquipmentDisposalAssetTurnoverRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备报废处置管理记录 */
export interface EquipmentDisposalMgmtRecordV13 {
  compliant: number;
  shouldAssess: number;
  timely: number;
  shouldDispose: number;
  disposed: number;
  totalAsset: number;
}

/**
 * 报废鉴定合规率（纯函数）：合规鉴定设备数/应鉴定报废设备数×100，保留 2 位小数。
 *
 * @param records 设备报废处置管理记录列表
 * @returns 报废鉴定合规率百分比
 */
export function computeEquipmentDisposalAssessmentComplianceRateV13(records: EquipmentDisposalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAssess, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 报废处置及时率（纯函数）：及时处置设备数/应处置报废设备数×100，保留 2 位小数。
 *
 * @param records 设备报废处置管理记录列表
 * @returns 报废处置及时率百分比
 */
export function computeEquipmentDisposalTimelinessRateV13(records: EquipmentDisposalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldDispose, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 设备资产周转率（纯函数，中性/反向指标）：期间处置报废设备数/设备资产总数×100，保留 2 位小数。
 *
 * @param records 设备报废处置管理记录列表
 * @returns 设备资产周转率百分比
 */
export function computeEquipmentDisposalAssetTurnoverRateV13(records: EquipmentDisposalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAsset, 0);
  if (total === 0) return 0;
  const disposed = records.reduce((acc, r) => acc + r.disposed, 0);
  return Math.round((disposed / total) * 10000) / 100;
}
