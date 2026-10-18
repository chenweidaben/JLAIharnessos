/**
 * 健澜科技 jlmedaios - 被服洗涤管理 V13 纯函数（M437-B，后勤保障与环境管理深化组）
 *
 * computeLaundryQualifiedRateV13 / computeLaundryTurnoverTimelinessRateV13 / computeLaundryCostControlRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 被服洗涤管理记录 */
export interface LaundryMgmtRecordV13 {
  qualifiedLaundry: number;
  totalLaundry: number;
  timelyTurnover: number;
  shouldTurnover: number;
  actualCost: number;
  budgetCost: number;
}

/**
 * 被服洗涤合格率（纯函数）：合格洗涤件数/洗涤总件数×100，保留 2 位小数。
 *
 * @param records 被服洗涤管理记录列表
 * @returns 被服洗涤合格率百分比
 */
export function computeLaundryQualifiedRateV13(records: LaundryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalLaundry, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedLaundry, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 被服周转及时率（纯函数）：及时周转次数/应周转次数×100，保留 2 位小数。
 *
 * @param records 被服洗涤管理记录列表
 * @returns 被服周转及时率百分比
 */
export function computeLaundryTurnoverTimelinessRateV13(records: LaundryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTurnover, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyTurnover, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 被服成本控制率（纯函数，反向指标，越低越好）：实际成本/预算成本×100，保留 2 位小数。
 *
 * @param records 被服洗涤管理记录列表
 * @returns 被服成本控制率百分比
 */
export function computeLaundryCostControlRateV13(records: LaundryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.budgetCost, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualCost, 0);
  return Math.round((actual / total) * 10000) / 100;
}
