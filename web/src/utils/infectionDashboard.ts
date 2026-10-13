/**
 * 健澜科技 jlmedaios - 院感看板展示工具（M76-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 超阈值标红阈值（每千日）。 */
export const DEVICE_RATE_THRESHOLD = 3;
export const HAND_HYGIENE_MIN = 90;

export function isOverDeviceThreshold(rate: number): boolean {
  return rate > DEVICE_RATE_THRESHOLD;
}
