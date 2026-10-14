/**
 * 健澜科技 jlmedaios - 住院费用清单 groupByCategory 纯函数测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { groupByCategory, round2, type BillFeeLine } from '../../src/bff/aggregators/billAggregator.js';

describe('round2 金额取整', () => {
  it('四舍五入到分', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.006)).toBe(1.01);
    expect(round2(1.004)).toBe(1);
  });
  it('非有限数按 0', () => {
    expect(round2(NaN)).toBe(0);
    expect(round2(Infinity)).toBe(0);
  });
});

describe('groupByCategory 按类别汇总', () => {
  it('空入参返回空数组', () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it('同类别金额累加并计数', () => {
    const items: BillFeeLine[] = [
      { category: 'drug', amount: 10.5 },
      { category: 'drug', amount: 20.0 },
      { category: 'drug', amount: 0.01 },
    ];
    const r = groupByCategory(items);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ category: 'drug', total: 30.51, count: 3 });
  });

  it('多类别分别汇总', () => {
    const items: BillFeeLine[] = [
      { category: 'bed', amount: 600 },
      { category: 'lab', amount: 25 },
      { category: 'imaging', amount: 280 },
      { category: 'bed', amount: 120 },
    ];
    const r = groupByCategory(items);
    const byCat = Object.fromEntries(r.map((x) => [x.category, x]));
    expect(byCat.bed).toEqual({ category: 'bed', total: 720, count: 2 });
    expect(byCat.lab).toEqual({ category: 'lab', total: 25, count: 1 });
    expect(byCat.imaging).toEqual({ category: 'imaging', total: 280, count: 1 });
  });

  it('按合计金额从大到小排序', () => {
    const items: BillFeeLine[] = [
      { category: 'lab', amount: 25 },
      { category: 'bed', amount: 600 },
      { category: 'drug', amount: 86.4 },
    ];
    const r = groupByCategory(items);
    expect(r.map((x) => x.category)).toEqual(['bed', 'drug', 'lab']);
  });

  it('浮点累加误差收敛到分', () => {
    const items: BillFeeLine[] = [
      { category: 'material', amount: 0.1 },
      { category: 'material', amount: 0.2 },
    ];
    const r = groupByCategory(items);
    expect(r[0].total).toBe(0.3);
  });

  it('非数字金额按 0 计入但仍计数', () => {
    const items = [
      { category: 'other', amount: 'abc' as unknown as number },
      { category: 'other', amount: 10 },
    ];
    const r = groupByCategory(items);
    expect(r[0]).toEqual({ category: 'other', total: 10, count: 2 });
  });
});
