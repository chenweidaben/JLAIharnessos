/**
 * 健澜科技 jlmedaios - 电子病历五级评审自评仪表盘（M90-A + M93-B）纯函数单测
 *
 * 覆盖：passRateTrend 按日分桶、合格率口径（≥90）、null score/缺日期跳过、
 * 日期升序排序。全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { passRateTrend } from '../../src/bff/aggregators/emrLevel5Aggregator';

describe('五级评审 passRateTrend 合格率口径', () => {
  it('空集合 → 空趋势', () => {
    expect(passRateTrend([])).toEqual([]);
  });

  it('同日多份：≥90 计入分子，合格率 = passed/total', () => {
    const trend = passRateTrend([
      { score: 95, createdAt: '2026-10-10T09:00:00' },
      { score: 88, createdAt: '2026-10-10T10:00:00' },
      { score: 90, createdAt: '2026-10-10T11:00:00' }, // 90 分整：合格（≥90）
    ]);
    expect(trend.length).toBe(1);
    expect(trend[0]).toMatchObject({ date: '2026-10-10', total: 3, passed: 2, passRate: 2 / 3 });
  });

  it('跨日分桶并按日期升序返回', () => {
    const trend = passRateTrend([
      { score: 70, createdAt: '2026-10-12T09:00:00' },
      { score: 92, createdAt: '2026-10-10T09:00:00' },
      { score: 81, createdAt: '2026-10-11T09:00:00' },
    ]);
    expect(trend.map((t) => t.date)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12']);
    expect(trend[0].passRate).toBe(1); // 92 合格
    expect(trend[2].passRate).toBe(0); // 70 不合格
  });

  it('score 为 null 或日期缺失的记录被跳过，不计入分母', () => {
    const trend = passRateTrend([
      { score: null, createdAt: '2026-10-10T09:00:00' },
      { score: 95, createdAt: '' },
      { score: 95, createdAt: '2026-10-10T09:00:00' },
    ]);
    expect(trend.length).toBe(1);
    expect(trend[0]).toMatchObject({ date: '2026-10-10', total: 1, passed: 1, passRate: 1 });
  });

  it('边界值：75 不合格 / 90 合格', () => {
    const trend = passRateTrend([
      { score: 75, createdAt: '2026-10-10T09:00:00' },
      { score: 90, createdAt: '2026-10-10T10:00:00' },
    ]);
    expect(trend[0].passed).toBe(1);
    expect(trend[0].total).toBe(2);
    expect(trend[0].passRate).toBe(0.5);
  });
});
