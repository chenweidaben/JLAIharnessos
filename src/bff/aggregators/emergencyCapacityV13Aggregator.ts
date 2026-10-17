/**
 * 健澜科技 jlmedaios - 急诊容量预警 V13 纯函数（M312-D）
 *
 * computeObsBedOccupancyV13 / assessWaitTimeV13 / identifyNeedReinforceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 留观床 */
export interface ObsBedV13 {
  total: number;
  occupied: number;
}

/**
 * 留观床占用率（纯函数）：occupied/total×100，整数。
 *
 * @param beds 留观床
 * @returns 占用率
 */
export function computeObsBedOccupancyV13(beds: ObsBedV13): number {
  if (beds.total === 0) return 0;
  return Math.round((beds.occupied / beds.total) * 100);
}

/**
 * 候诊时长灯色（纯函数）：>60min 红灯 / 30-60min 黄灯 / <30min 绿灯。
 *
 * @param avgWaitMin 平均候诊分钟
 * @returns 灯色
 */
export function assessWaitTimeV13(avgWaitMin: number): string {
  if (avgWaitMin > 60) return "红灯";
  if (avgWaitMin >= 30) return "黄灯";
  return "绿灯";
}

/**
 * 需增援判定（纯函数）：占用率≥90% 或 候诊>60min → "需增援"，否则 "运行平稳"。
 *
 * @param occupancyRate 留观床占用率
 * @param waitMin 平均候诊分钟
 * @returns 增援判定
 */
export function identifyNeedReinforceV13(occupancyRate: number, waitMin: number): string {
  if (occupancyRate >= 90 || waitMin > 60) return "需增援";
  return "运行平稳";
}
