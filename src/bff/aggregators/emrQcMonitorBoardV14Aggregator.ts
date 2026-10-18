/**
 * 健澜科技 jlmedaios - 病历质控质量监控大盘 V14 聚合器（M474-D，M474 收官）
 *
 * 纯函数：组装监控大盘数据 + 实时事件按 count 降序排列。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 监控大盘数据 */
export interface MonitorBoardV14 {
  todayReviewed: number;
  todayPending: number;
  weekPassRate: number;
  alertCount: number;
}

/** 实时事件 */
export interface RealTimeEventV14 {
  action: string;
  count: number;
}

/**
 * 组装监控大盘数据。
 *
 * @param data 监控数据
 * @returns 大盘数据
 */
export function buildMonitorBoard(data: MonitorBoardV14): MonitorBoardV14 {
  return {
    todayReviewed: data.todayReviewed,
    todayPending: data.todayPending,
    weekPassRate: data.weekPassRate,
    alertCount: data.alertCount,
  };
}

/**
 * 按 count 降序排列实时事件。
 *
 * @param events 实时事件列表
 * @returns 降序后的事件列表
 */
export function buildRealTimeStats(events: RealTimeEventV14[]): RealTimeEventV14[] {
  return [...events].sort((a, b) => b.count - a.count);
}
