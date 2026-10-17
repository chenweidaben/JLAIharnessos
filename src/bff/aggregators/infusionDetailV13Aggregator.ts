/**
 * 健澜科技 jlmedaios - 输液管理（细节）V13 纯函数（M424-C，detail 避让旧版 infusionMgmtV13（M359-D））
 *
 * computeInfusionReactionOccurrenceRateV13 / computeInfusionPunctureSuccessRateV13 / computeInfusionPatrolArriveRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输液管理（细节）记录 */
export interface InfusionDetailRecordV13 {
  reactionOccurred: number;
  infusionTotal: number;
  punctureSuccess: number;
  punctureTotal: number;
  patrolArrived: number;
  shouldPatrolTotal: number;
}

/**
 * 输液反应发生率（纯函数，反向指标，值越低越好）：发生反应数/输液总例数×100，保留 2 位小数。
 *
 * @param records 输液管理（细节）记录列表
 * @returns 输液反应发生率百分比
 */
export function computeInfusionReactionOccurrenceRateV13(records: InfusionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.infusionTotal, 0);
  if (total === 0) return 0;
  const reaction = records.reduce((acc, r) => acc + r.reactionOccurred, 0);
  return Math.round((reaction / total) * 10000) / 100;
}

/**
 * 输液穿刺成功率（纯函数）：成功穿刺数/穿刺总次数×100，保留 2 位小数。
 *
 * @param records 输液管理（细节）记录列表
 * @returns 输液穿刺成功率百分比
 */
export function computeInfusionPunctureSuccessRateV13(records: InfusionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.punctureTotal, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.punctureSuccess, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * 输液巡视到位率（纯函数）：到位巡视次数/应巡视次数×100，保留 2 位小数。
 *
 * @param records 输液管理（细节）记录列表
 * @returns 输液巡视到位率百分比
 */
export function computeInfusionPatrolArriveRateV13(records: InfusionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldPatrolTotal, 0);
  if (total === 0) return 0;
  const arrived = records.reduce((acc, r) => acc + r.patrolArrived, 0);
  return Math.round((arrived / total) * 10000) / 100;
}
