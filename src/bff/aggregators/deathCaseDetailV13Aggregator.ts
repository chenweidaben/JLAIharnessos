/**
 * 健澜科技 jlmedaios - 死亡病例管理（细节）V13 纯函数（M427-D，M427 收官，detail 避让旧版 deathCaseMgmtV13（M412））
 *
 * computeDeathCaseDiscussionRateV13 / computeDeathCaseDiscussionTimelyRateV13 / computeDeathCaseRecordCompleteRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 死亡病例管理（细节）记录 */
export interface DeathCaseDetailRecordV13 {
  discussed: number;
  deathTotal: number;
  discussionTimely: number;
  shouldDiscuss: number;
  recordComplete: number;
}

/**
 * 死亡病例讨论率（纯函数）：讨论死亡病例数/死亡病例总数×100，保留 2 位小数。
 *
 * @param records 死亡病例管理（细节）记录列表
 * @returns 死亡病例讨论率百分比
 */
export function computeDeathCaseDiscussionRateV13(records: DeathCaseDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deathTotal, 0);
  if (total === 0) return 0;
  const discussed = records.reduce((acc, r) => acc + r.discussed, 0);
  return Math.round((discussed / total) * 10000) / 100;
}

/**
 * 死亡病例讨论及时率（纯函数）：及时完成讨论数/应讨论死亡病例数×100，保留 2 位小数。
 *
 * @param records 死亡病例管理（细节）记录列表
 * @returns 死亡病例讨论及时率百分比
 */
export function computeDeathCaseDiscussionTimelyRateV13(records: DeathCaseDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldDiscuss, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.discussionTimely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 死亡病例记录完整率（纯函数）：完整记录数/死亡病例总数×100，保留 2 位小数。
 *
 * @param records 死亡病例管理（细节）记录列表
 * @returns 死亡病例记录完整率百分比
 */
export function computeDeathCaseRecordCompleteRateV13(records: DeathCaseDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deathTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.recordComplete, 0);
  return Math.round((complete / total) * 10000) / 100;
}
