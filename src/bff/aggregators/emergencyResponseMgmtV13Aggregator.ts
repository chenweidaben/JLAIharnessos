/**
 * 健澜科技 jlmedaios - 突发事件处置管理 V13 纯函数（M447-B，应急管理与安全生产管理组）
 *
 * computeEmergencyResponseTimelinessRateV13 / computeEmergencyResponseClosedLoopRateV13 / computeEmergencyResponsePostEvaluationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 突发事件处置管理记录 */
export interface EmergencyResponseMgmtRecordV13 {
  timelyResponse: number;
  totalEvent: number;
  closedLoop: number;
  evaluated: number;
  shouldEvaluate: number;
}

/**
 * 应急响应及时率（纯函数）：及时响应事件数/事件总数×100，保留 2 位小数。
 *
 * @param records 突发事件处置管理记录列表
 * @returns 应急响应及时率百分比
 */
export function computeEmergencyResponseTimelinessRateV13(records: EmergencyResponseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEvent, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyResponse, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 事件处置闭环率（纯函数）：已闭环事件数/事件总数×100，保留 2 位小数。
 *
 * @param records 突发事件处置管理记录列表
 * @returns 事件处置闭环率百分比
 */
export function computeEmergencyResponseClosedLoopRateV13(records: EmergencyResponseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEvent, 0);
  if (total === 0) return 0;
  const closed = records.reduce((acc, r) => acc + r.closedLoop, 0);
  return Math.round((closed / total) * 10000) / 100;
}

/**
 * 事后评估完成率（纯函数）：已完成事后评估事件数/应评估事件总数×100，保留 2 位小数。
 *
 * @param records 突发事件处置管理记录列表
 * @returns 事后评估完成率百分比
 */
export function computeEmergencyResponsePostEvaluationRateV13(records: EmergencyResponseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldEvaluate, 0);
  if (total === 0) return 0;
  const evaluatedCount = records.reduce((acc, r) => acc + r.evaluated, 0);
  return Math.round((evaluatedCount / total) * 10000) / 100;
}
