/**
 * 健澜科技 jlmedaios - 实验室生物安全质量管理 V13 纯函数（M436-C，院感安全环保质量管理深化组）
 *
 * computeLabBiosafetyIncidentCountV13 / computeLabBiosafetyCabinetQualifiedRateV13 / computeLabBiosafetyStrainManagementComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 实验室生物安全质量管理记录 */
export interface LabBiosafetyQualityMgmtRecordV13 {
  incidentCount: number;
  qualifiedCabinets: number;
  totalCabinets: number;
  compliantItems: number;
  totalItems: number;
}

/**
 * 生物安全事件数（纯函数，整数求和类，单位次，反向指标，越低越好）：对 incidentCount 求和。
 *
 * @param records 实验室生物安全质量管理记录列表
 * @returns 生物安全事件数（整数次）
 */
export function computeLabBiosafetyIncidentCountV13(records: LabBiosafetyQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.incidentCount, 0);
}

/**
 * 生物安全柜合格率（纯函数）：合格生物安全柜数/生物安全柜总数×100，保留 2 位小数。
 *
 * @param records 实验室生物安全质量管理记录列表
 * @returns 生物安全柜合格率百分比
 */
export function computeLabBiosafetyCabinetQualifiedRateV13(records: LabBiosafetyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCabinets, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedCabinets, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 菌毒种管理合规率（纯函数）：合规管理项数/管理项总数×100，保留 2 位小数。
 *
 * @param records 实验室生物安全质量管理记录列表
 * @returns 菌毒种管理合规率百分比
 */
export function computeLabBiosafetyStrainManagementComplianceRateV13(records: LabBiosafetyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalItems, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantItems, 0);
  return Math.round((compliant / total) * 10000) / 100;
}
