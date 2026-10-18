/**
 * 健澜科技 jlmedaios - 信息运维服务管理 V13 纯函数（M446-D，M446 收官，信息化建设与数据安全管理组）
 *
 * computeItServiceDeskResponseTimelinessRateV13 / computeItServiceDeskResolutionRateV13 / computeItServiceDeskTerminalRepairMinutesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息运维服务管理记录 */
export interface ItServiceDeskMgmtRecordV13 {
  timelyResponse: number;
  totalTicket: number;
  resolved: number;
  avgRepairMinutes: number;
}

/**
 * 工单响应及时率（纯函数）：及时响应工单数/工单总数×100，保留 2 位小数。
 *
 * @param records 信息运维服务管理记录列表
 * @returns 工单响应及时率百分比
 */
export function computeItServiceDeskResponseTimelinessRateV13(records: ItServiceDeskMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTicket, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyResponse, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 工单解决率（纯函数）：已解决工单数/工单总数×100，保留 2 位小数。
 *
 * @param records 信息运维服务管理记录列表
 * @returns 工单解决率百分比
 */
export function computeItServiceDeskResolutionRateV13(records: ItServiceDeskMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTicket, 0);
  if (total === 0) return 0;
  const resolvedCount = records.reduce((acc, r) => acc + r.resolved, 0);
  return Math.round((resolvedCount / total) * 10000) / 100;
}

/**
 * 终端故障修复时长（纯函数，平均时长指标）：平均修复时长，单位分钟，Math.ceil(avg) 整分钟。
 *
 * @param records 信息运维服务管理记录列表
 * @returns 终端故障修复时长（整分钟，整数）
 */
export function computeItServiceDeskTerminalRepairMinutesV13(records: ItServiceDeskMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.avgRepairMinutes, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}
