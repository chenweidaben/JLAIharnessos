/**
 * 健澜科技 jlmedaios - 随访完成率 V13 纯函数（M326-C）
 *
 * compute7DayFollowUpRateV13 / compute30DayFollowUpRateV13 / listIncompleteFollowUpsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 随访记录 */
export interface FollowUpRecordV13 {
  patientName: string;
  completed7Day: boolean;
  completed30Day: boolean;
}

/**
 * 出院 7 天随访完成率（纯函数）：已完成/应随访×100。
 *
 * @param followUps 随访记录列表
 * @returns 完成率百分比
 */
export function compute7DayFollowUpRateV13(followUps: FollowUpRecordV13[]): number {
  if (followUps.length === 0) return 0;
  const completed = followUps.filter((f) => f.completed7Day).length;
  return Math.round((completed / followUps.length) * 100);
}

/**
 * 出院 30 天随访完成率（纯函数）：已完成/应随访×100。
 *
 * @param followUps 随访记录列表
 * @returns 完成率百分比
 */
export function compute30DayFollowUpRateV13(followUps: FollowUpRecordV13[]): number {
  if (followUps.length === 0) return 0;
  const completed = followUps.filter((f) => f.completed30Day).length;
  return Math.round((completed / followUps.length) * 100);
}

/**
 * 未完成名单（纯函数）：7 天未完成的患者列表。
 *
 * @param followUps 随访记录列表
 * @returns 未完成患者名单
 */
export function listIncompleteFollowUpsV13(followUps: FollowUpRecordV13[]): string[] {
  return followUps.filter((f) => !f.completed7Day).map((f) => f.patientName);
}
