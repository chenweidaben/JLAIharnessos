/**
 * 健澜科技 jlmedaios - 新生儿管理 V13 纯函数（M412-B）
 *
 * computeNewbornApgarPassRateV13 / computeNewbornVisitRateV13 / computeNewbornAsphyxiaRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 新生儿管理记录 */
export interface NewbornMgmtRecordV13 {
  apgarPass: number;
  visited: number;
  asphyxia: number;
  newbornTotal: number;
}

/**
 * 新生儿Apgar评分合格率（纯函数）：Apgar≥8分人数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 新生儿管理记录列表
 * @returns Apgar评分合格率百分比
 */
export function computeNewbornApgarPassRateV13(records: NewbornMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.newbornTotal, 0);
  if (total === 0) return 0;
  const apgarPass = records.reduce((acc, r) => acc + r.apgarPass, 0);
  return Math.round((apgarPass / total) * 10000) / 100;
}

/**
 * 新生儿访视率（纯函数）：已访视新生儿数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 新生儿管理记录列表
 * @returns 新生儿访视率百分比
 */
export function computeNewbornVisitRateV13(records: NewbornMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.newbornTotal, 0);
  if (total === 0) return 0;
  const visited = records.reduce((acc, r) => acc + r.visited, 0);
  return Math.round((visited / total) * 10000) / 100;
}

/**
 * 新生儿窒息发生率（纯函数）：窒息人数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 新生儿管理记录列表
 * @returns 新生儿窒息发生率百分比
 */
export function computeNewbornAsphyxiaRateV13(records: NewbornMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.newbornTotal, 0);
  if (total === 0) return 0;
  const asphyxia = records.reduce((acc, r) => acc + r.asphyxia, 0);
  return Math.round((asphyxia / total) * 10000) / 100;
}
