/**
 * 健澜科技 jlmedaios - 后勤管理 V13 纯函数（M362-C）
 *
 * computeEquipmentIntactRateV13 / computeMaterialSupplyTimelyRateV13 / computePropertySatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 后勤管理记录 */
export interface LogisticsMgmtRecordV13 {
  intactEquipment: number;
  totalEquipment: number;
  timelySupply: number;
  totalSupply: number;
  propertySatisfaction: number;
}

/**
 * 设备完好率（纯函数）：完好设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 后勤管理记录列表
 * @returns 设备完好率百分比
 */
export function computeEquipmentIntactRateV13(records: LogisticsMgmtRecordV13[]): number {
  const intact = records.reduce((acc, r) => acc + r.intactEquipment, 0);
  const total = records.reduce((acc, r) => acc + r.totalEquipment, 0);
  if (total === 0) return 0;
  return Math.round((intact / total) * 10000) / 100;
}

/**
 * 物资供应及时率（纯函数）：及时次数/供应次数×100，保留 2 位小数。
 *
 * @param records 后勤管理记录列表
 * @returns 物资供应及时率百分比
 */
export function computeMaterialSupplyTimelyRateV13(records: LogisticsMgmtRecordV13[]): number {
  const timely = records.reduce((acc, r) => acc + r.timelySupply, 0);
  const total = records.reduce((acc, r) => acc + r.totalSupply, 0);
  if (total === 0) return 0;
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 物业满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 后勤管理记录列表
 * @returns 物业满意度均值
 */
export function computePropertySatisfactionV13(records: LogisticsMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.propertySatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
