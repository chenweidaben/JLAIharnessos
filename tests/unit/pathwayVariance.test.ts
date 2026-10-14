/**
 * 健澜科技 jlmedaios - 临床路径变异率纯函数单测（213）
 *
 * 纯函数、确定性、无 I/O。覆盖 varianceRate 边界：空集、除零、非法数值、多记录聚合。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import { varianceRate } from '../../src/bff/aggregators/pathwayVarianceAggregator.js';

describe('213 varianceRate 正常口径', () => {
  it('变异例数 / 总入径例数', () => {
    expect(varianceRate([{ variedCount: 3, enrolledCount: 10 }])).toBeCloseTo(0.3);
  });
  it('多条记录先合计分子分母再相除（整体口径）', () => {
    expect(varianceRate([
      { variedCount: 2, enrolledCount: 4 },
      { variedCount: 3, enrolledCount: 6 },
    ])).toBeCloseTo(0.5);
  });
  it('无变异记录时为 0', () => {
    expect(varianceRate([{ variedCount: 0, enrolledCount: 20 }])).toBe(0);
  });
});

describe('213 varianceRate 边界（不抛除零错误）', () => {
  it('空数组返回 0', () => {
    expect(varianceRate([])).toBe(0);
  });
  it('null / undefined 返回 0', () => {
    expect(varianceRate(null)).toBe(0);
    expect(varianceRate(undefined)).toBe(0);
  });
  it('分母为 0 返回 0，不除零', () => {
    expect(varianceRate([{ variedCount: 5, enrolledCount: 0 }])).toBe(0);
  });
  it('非法数值按 0 计入，合法数值照常统计', () => {
    // 第 1 行 NaN 分子跳过但分母 10 有效；第 2 行分子 2 有效但 Infinity 分母跳过；
    // 第 3 行负数整行不计。合计：varied=2, enrolled=10 -> 0.2
    expect(varianceRate([
      { variedCount: Number.NaN, enrolledCount: 10 },
      { variedCount: 2, enrolledCount: Number.POSITIVE_INFINITY },
      { variedCount: -3, enrolledCount: -10 },
    ])).toBeCloseTo(0.2);
  });
  it('全部为非法数值时返回 0', () => {
    expect(varianceRate([
      { variedCount: Number.NaN, enrolledCount: Number.NaN },
      { variedCount: -1, enrolledCount: 0 },
    ])).toBe(0);
  });
  it('空对象元素跳过不崩', () => {
    expect(varianceRate([{} as never, { variedCount: 1, enrolledCount: 4 }])).toBeCloseTo(0.25);
  });
});
