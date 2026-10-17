/**
 * 健澜科技 jlmedaios - 互联互通管理 V13 纯函数（M409-D，M409 收官）
 *
 * computeInteropMaturityLevelV13 / computeInterfaceStandardizationRateV13 / computeDataSharingExchangeRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 互联互通管理记录 */
export interface InteropMgmtRecordV13 {
  level: number;
  standardized: number;
  total: number;
  shared: number;
  should: number;
}

/**
 * 互联互通成熟度测评等级（纯函数）：取最高等级（Math.max）。
 *
 * @param records 互联互通管理记录列表
 * @returns 最高测评等级
 */
export function computeInteropMaturityLevelV13(records: InteropMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  return Math.max(...records.map((r) => r.level));
}

/**
 * 接口标准化率（纯函数）：标准化接口数/接口总数×100，保留 2 位小数。
 *
 * @param records 互联互通管理记录列表
 * @returns 接口标准化率百分比
 */
export function computeInterfaceStandardizationRateV13(records: InteropMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const standardized = records.reduce((acc, r) => acc + r.standardized, 0);
  return Math.round((standardized / total) * 10000) / 100;
}

/**
 * 数据共享交换率（纯函数）：已共享数据数/应共享数据总数×100，保留 2 位小数。
 *
 * @param records 互联互通管理记录列表
 * @returns 数据共享交换率百分比
 */
export function computeDataSharingExchangeRateV13(records: InteropMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.should, 0);
  if (total === 0) return 0;
  const shared = records.reduce((acc, r) => acc + r.shared, 0);
  return Math.round((shared / total) * 10000) / 100;
}
