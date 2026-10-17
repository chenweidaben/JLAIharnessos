/**
 * 健澜科技 jlmedaios - 死亡病例管理 V13 纯函数（M412-A）
 *
 * computeDeathCaseDiscussionRateV13 / computeDeathReportTimelyRateV13 / computeDeathCauseRegistrationPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 死亡病例管理记录 */
export interface DeathReportMgmtRecordV13 {
  discussed: number;
  deathTotal: number;
  timely: number;
  reportTotal: number;
  qualified: number;
  registrationTotal: number;
}

/**
 * 死亡病例讨论率（纯函数）：已讨论病例数/死亡病例总数×100，保留 2 位小数。
 *
 * @param records 死亡病例管理记录列表
 * @returns 死亡病例讨论率百分比
 */
export function computeDeathCaseDiscussionRateV13(records: DeathReportMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deathTotal, 0);
  if (total === 0) return 0;
  const discussed = records.reduce((acc, r) => acc + r.discussed, 0);
  return Math.round((discussed / total) * 10000) / 100;
}

/**
 * 死亡报告及时率（纯函数）：及时报告数/死亡报告总数×100，保留 2 位小数。
 *
 * @param records 死亡病例管理记录列表
 * @returns 死亡报告及时率百分比
 */
export function computeDeathReportTimelyRateV13(records: DeathReportMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 死亡原因登记合格率（纯函数）：合格登记数/登记总数×100，保留 2 位小数。
 *
 * @param records 死亡病例管理记录列表
 * @returns 死亡原因登记合格率百分比
 */
export function computeDeathCauseRegistrationPassRateV13(records: DeathReportMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.registrationTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
