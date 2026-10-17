/**
 * 健澜科技 jlmedaios - 病房环境管理 V13 纯函数（M426-D，M426 收官，换名避让旧版 wardMgmtDetailV13（M417））
 *
 * computeWardPatrolArriveRateV13 / computeWardEnvironmentPassRateV13 / computePatientCallResponseMinutesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病房环境管理记录 */
export interface WardEnvironmentMgmtRecordV13 {
  patrolArrived: number;
  shouldPatrol: number;
  envPass: number;
  envTotal: number;
  respMinutes: number;
}

/**
 * 病房巡查到位率（纯函数）：到位巡查次数/应巡查次数×100，保留 2 位小数。
 *
 * @param records 病房环境管理记录列表
 * @returns 病房巡查到位率百分比
 */
export function computeWardPatrolArriveRateV13(records: WardEnvironmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldPatrol, 0);
  if (total === 0) return 0;
  const arrived = records.reduce((acc, r) => acc + r.patrolArrived, 0);
  return Math.round((arrived / total) * 10000) / 100;
}

/**
 * 病房环境合格率（纯函数）：合格检查点数/检查点总数×100，保留 2 位小数。
 *
 * @param records 病房环境管理记录列表
 * @returns 病房环境合格率百分比
 */
export function computeWardEnvironmentPassRateV13(records: WardEnvironmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.envTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.envPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 患者呼叫响应时间（纯函数）：平均值，单位分钟，Math.ceil 整分钟向上取整。
 *
 * @param records 病房环境管理记录列表
 * @returns 患者呼叫响应时间平均值（整分钟）
 */
export function computePatientCallResponseMinutesV13(records: WardEnvironmentMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.respMinutes, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}
