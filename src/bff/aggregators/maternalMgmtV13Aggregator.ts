/**
 * 健澜科技 jlmedaios - 孕产妇管理 V13 纯函数（M412-C）
 *
 * computeMaternalSystemMgmtRateV13 / computePostpartumVisitRateV13 / computeCesareanSectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 孕产妇管理记录 */
export interface MaternalMgmtRecordV13 {
  systemManaged: number;
  maternalTotal: number;
  visited: number;
  postpartumTotal: number;
  cesarean: number;
  deliveryTotal: number;
}

/**
 * 孕产妇系统管理率（纯函数）：系统管理孕产妇数/孕产妇总数×100，保留 2 位小数。
 *
 * @param records 孕产妇管理记录列表
 * @returns 孕产妇系统管理率百分比
 */
export function computeMaternalSystemMgmtRateV13(records: MaternalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.maternalTotal, 0);
  if (total === 0) return 0;
  const systemManaged = records.reduce((acc, r) => acc + r.systemManaged, 0);
  return Math.round((systemManaged / total) * 10000) / 100;
}

/**
 * 产后访视率（纯函数）：已访视产妇数/产妇总数×100，保留 2 位小数。
 *
 * @param records 孕产妇管理记录列表
 * @returns 产后访视率百分比
 */
export function computePostpartumVisitRateV13(records: MaternalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.postpartumTotal, 0);
  if (total === 0) return 0;
  const visited = records.reduce((acc, r) => acc + r.visited, 0);
  return Math.round((visited / total) * 10000) / 100;
}

/**
 * 剖宫产率（纯函数）：剖宫产数/分娩总数×100，保留 2 位小数。
 *
 * @param records 孕产妇管理记录列表
 * @returns 剖宫产率百分比
 */
export function computeCesareanSectionRateV13(records: MaternalMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deliveryTotal, 0);
  if (total === 0) return 0;
  const cesarean = records.reduce((acc, r) => acc + r.cesarean, 0);
  return Math.round((cesarean / total) * 10000) / 100;
}
