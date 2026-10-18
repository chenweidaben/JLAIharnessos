/**
 * 健澜科技 jlmedaios - 社工服务管理 V13 纯函数（M457-D，M457 收官，医院文化与公益管理组）
 *
 * computeSocialWorkServiceCaseCountV13 / computeSocialWorkServiceGroupActivityCountV13 / computeSocialWorkServiceDifficultyPatientAssistRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 社工服务管理记录 */
export interface SocialWorkServiceMgmtRecordV13 {
  caseCount: number;
  groupActivityCount: number;
  assisted: number;
  totalDifficulty: number;
}

/**
 * 社工个案数量（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.caseCount, 0)，直接返回计数。
 *
 * @param records 社工服务管理记录列表
 * @returns 社工个案总数量（件）
 */
export function computeSocialWorkServiceCaseCountV13(records: SocialWorkServiceMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.caseCount, 0);
}

/**
 * 社工小组活动次数（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.groupActivityCount, 0)，直接返回计数。
 *
 * @param records 社工服务管理记录列表
 * @returns 社工小组活动总次数（次）
 */
export function computeSocialWorkServiceGroupActivityCountV13(records: SocialWorkServiceMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.groupActivityCount, 0);
}

/**
 * 困难患者救助率（纯函数）：已救助困难患者数/困难患者总数×100，保留 2 位小数。
 *
 * @param records 社工服务管理记录列表
 * @returns 困难患者救助率百分比
 */
export function computeSocialWorkServiceDifficultyPatientAssistRateV13(records: SocialWorkServiceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDifficulty, 0);
  if (total === 0) return 0;
  const assisted = records.reduce((acc, r) => acc + r.assisted, 0);
  return Math.round((assisted / total) * 10000) / 100;
}
