/**
 * 健澜科技 jlmedaios - 电梯等候时间 V13 纯函数（M331-C）
 *
 * computeAvgElevatorWaitV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 电梯等候记录 */
export interface ElevatorWaitV13 {
  waitMinutes: number;
}

/**
 * 门诊高峰平均等候时长（纯函数）：均值，分钟。
 *
 * @param records 等候记录列表
 * @returns 平均等候时长
 */
export function computeAvgElevatorWaitV13(records: ElevatorWaitV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.waitMinutes, 0);
  return Math.round(total / records.length);
}
