/**
 * 健澜科技 jlmedaios - 医疗设备采购管理 V13 纯函数（M449-A，医疗装备与设备管理组）
 *
 * computeMedicalEquipmentPurchasePlanCompletionRateV13 / computeMedicalEquipmentPurchaseBiddingComplianceRateV13 / computeMedicalEquipmentPurchaseAcceptanceQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗设备采购管理记录 */
export interface MedicalEquipmentPurchaseMgmtRecordV13 {
  completed: number;
  planned: number;
  compliant: number;
  totalBidding: number;
  qualified: number;
  totalAcceptance: number;
}

/**
 * 采购计划完成率（纯函数）：已完成采购项目数/采购计划项目总数×100，保留 2 位小数。
 *
 * @param records 医疗设备采购管理记录列表
 * @returns 采购计划完成率百分比
 */
export function computeMedicalEquipmentPurchasePlanCompletionRateV13(records: MedicalEquipmentPurchaseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.planned, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 招标采购合规率（纯函数）：合规招标项目数/招标项目总数×100，保留 2 位小数。
 *
 * @param records 医疗设备采购管理记录列表
 * @returns 招标采购合规率百分比
 */
export function computeMedicalEquipmentPurchaseBiddingComplianceRateV13(records: MedicalEquipmentPurchaseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBidding, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 设备到货验收合格率（纯函数）：验收合格设备数/到货设备总数×100，保留 2 位小数。
 *
 * @param records 医疗设备采购管理记录列表
 * @returns 设备到货验收合格率百分比
 */
export function computeMedicalEquipmentPurchaseAcceptanceQualifiedRateV13(records: MedicalEquipmentPurchaseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAcceptance, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
