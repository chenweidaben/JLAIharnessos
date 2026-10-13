/**
 * 健澜科技 jlmedaios - 药事看板展示工具（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DDDs 每百人天上限阈值。 */
export const DDDS_PER100_THRESHOLD = 40;

export function isOverDddsThreshold(rate: number): boolean {
  return rate > DDDS_PER100_THRESHOLD;
}
