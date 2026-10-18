/**
 * 健澜科技 jlmedaios - 孕产妇系统管理 V13 纯函数（M442-A，妇幼健康与计划生育管理组）
 *
 * computeMaternalHealthRecordRateV13 / computeMaternalHealthSystemRateV13 / computeMaternalHealthPostnatalVisitRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 孕产妇系统管理记录 */
export interface MaternalHealthMgmtRecordV13 {
  registeredMaternal: number;
  totalMaternal: number;
  systemManaged: number;
  visitedPostnatal: number;
  shouldVisitPostnatal: number;
}

/**
 * 孕产妇建册率（纯函数）：已建册孕产妇数/孕产妇总数×100，保留 2 位小数。
 *
 * @param records 孕产妇系统管理记录列表
 * @returns 孕产妇建册率百分比
 */
export function computeMaternalHealthRecordRateV13(records: MaternalHealthMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMaternal, 0);
  if (total === 0) return 0;
  const registered = records.reduce((acc, r) => acc + r.registeredMaternal, 0);
  return Math.round((registered / total) * 10000) / 100;
}

/**
 * 系统管理率（纯函数）：系统管理孕产妇数/孕产妇总数×100，保留 2 位小数。
 *
 * @param records 孕产妇系统管理记录列表
 * @returns 系统管理率百分比
 */
export function computeMaternalHealthSystemRateV13(records: MaternalHealthMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMaternal, 0);
  if (total === 0) return 0;
  const systemManaged = records.reduce((acc, r) => acc + r.systemManaged, 0);
  return Math.round((systemManaged / total) * 10000) / 100;
}

/**
 * 产后访视率（纯函数）：已访视产后数/应访视产后总数×100，保留 2 位小数。
 *
 * @param records 孕产妇系统管理记录列表
 * @returns 产后访视率百分比
 */
export function computeMaternalHealthPostnatalVisitRateV13(records: MaternalHealthMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldVisitPostnatal, 0);
  if (total === 0) return 0;
  const visited = records.reduce((acc, r) => acc + r.visitedPostnatal, 0);
  return Math.round((visited / total) * 10000) / 100;
}
