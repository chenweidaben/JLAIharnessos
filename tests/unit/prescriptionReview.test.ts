/**
 * 健澜科技 jlmedaios - 处方点评结果统计纯函数单测
 *
 * 覆盖：三结论计数、合理率计算（含四舍五入到 0.1%）、空记录 / 非法输入安全降级、
 * pending 透传与非法 pending 降级。全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { summarizeResults, type ReviewResult } from '../../src/bff/aggregators/prescriptionReviewAggregator';

const rec = (result: ReviewResult) => ({ result });

describe('结果统计 summarizeResults', () => {
  it('空记录 -> 全部为 0，合理率 0，不抛错', () => {
    const s = summarizeResults([]);
    expect(s).toEqual({ total: 0, rational: 0, irrational: 0, abnormal: 0, rationalRate: 0, pending: 0 });
  });

  it('三结论分别计数', () => {
    const s = summarizeResults([rec('rational'), rec('rational'), rec('irrational'), rec('abnormal')]);
    expect(s.total).toBe(4);
    expect(s.rational).toBe(2);
    expect(s.irrational).toBe(1);
    expect(s.abnormal).toBe(1);
  });

  it('合理率 = 合理/总数，保留一位小数百分数', () => {
    // 2/3 = 66.666... -> 66.7
    const s = summarizeResults([rec('rational'), rec('rational'), rec('irrational')]);
    expect(s.rationalRate).toBe(66.7);
  });

  it('全部合理 -> 合理率 100', () => {
    const s = summarizeResults([rec('rational'), rec('rational')]);
    expect(s.rationalRate).toBe(100);
  });

  it('pending 透传为待点评数', () => {
    const s = summarizeResults([rec('rational')], 12);
    expect(s.pending).toBe(12);
  });

  it('非法输入（非数组 / null / 未知 result）-> 安全降级，不抛错', () => {
    // 故意传非法输入验证防御（运行时降级，不依赖类型系统）
    expect(summarizeResults(undefined as never).total).toBe(0);
    expect(summarizeResults([{ result: 'unknown' }, null] as never).total).toBe(0);
  });

  it('非法 pending（负数 / NaN / 非数）-> 降级为 0', () => {
    expect(summarizeResults([], -3).pending).toBe(0);
    expect(summarizeResults([], Number.NaN).pending).toBe(0);
  });
});
