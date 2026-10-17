/**
 * 健澜科技 jlmedaios - 出院随访率 V13 纯函数（M347-C）
 *
 * computeShouldFollowUpV13 / computeActualFollowUpV13 / computeFollowUpRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出院随访记录 */
export interface FollowUpRecordV13 {
  shouldFollowUp: number;
  actualFollowUp: number;
}

/**
 * 应随访人数（纯函数）：求和。
 *
 * @param records 出院随访记录列表
 * @returns 应随访人数
 */
export function computeShouldFollowUpV13(records: FollowUpRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.shouldFollowUp, 0);
}

/**
 * 已随访人数（纯函数）：求和。
 *
 * @param records 出院随访记录列表
 * @returns 已随访人数
 */
export function computeActualFollowUpV13(records: FollowUpRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.actualFollowUp, 0);
}

/**
 * 随访完成率（纯函数）：已随访/应随访×100，保留 2 位小数。
 *
 * @param records 出院随访记录列表
 * @returns 随访完成率百分比
 */
export function computeFollowUpRateV13(records: FollowUpRecordV13[]): number {
  const actual = computeActualFollowUpV13(records);
  const should = computeShouldFollowUpV13(records);
  if (should === 0) return 0;
  return Math.round((actual / should) * 10000) / 100;
}
