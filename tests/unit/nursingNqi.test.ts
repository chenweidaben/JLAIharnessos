/**
 * 健澜科技 jlmedaios - 护理敏感指标（NQI）月度趋势纯函数单测
 *
 * 不依赖数据库/BFF：直接测 buildNqiTrend 纯函数与 listView 演示视图。
 *   1) 空输入 -> 空月份、四个指标零值；
 *   2) 乱序月份 -> 升序输出；
 *   3) 发生率口径 = 例数 / 住院床日 * 1000（‰），保留两位小数；
 *   4) 累计例数 / 最近月率 / 平均率 计算正确；
 *   5) 分母为 0 -> 发生率回退为 0，不抛错；
 *   6) listView() -> demo: true，近 12 个月、四类指标齐全。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildNqiTrend,
  listView,
  NQI_INDICATORS,
  type NqiMonthRow,
} from '../../src/bff/aggregators/nursingNqiAggregator';

const row = (
  month: string,
  fall: number,
  pressureUlcer: number,
  tubeDislodgement: number,
  medError: number,
  patientDays: number,
): NqiMonthRow => ({ month, fall, pressureUlcer, tubeDislodgement, medError, patientDays });

describe('buildNqiTrend', () => {
  it('空输入 -> 空月份、四个指标全部零值', () => {
    const r = buildNqiTrend([]);
    expect(r.months).toEqual([]);
    expect(r.indicators).toHaveLength(4);
    expect(r.demo).toBe(false);
    for (const ind of r.indicators) {
      expect(ind.totalEvents).toBe(0);
      expect(ind.latestRate).toBe(0);
      expect(ind.avgRate).toBe(0);
      expect(ind.trend).toEqual([]);
      expect(ind.unit).toBe('‰');
    }
  });

  it('乱序月份 -> 输出按月份升序', () => {
    const r = buildNqiTrend([
      row('2026-03', 1, 0, 0, 0, 10000),
      row('2026-01', 1, 0, 0, 0, 10000),
      row('2026-02', 1, 0, 0, 0, 10000),
    ]);
    expect(r.months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('发生率口径 = 例数 / 床日 * 1000（‰），保留两位小数', () => {
    // 5 例 / 10000 床日 * 1000 = 0.5‰
    const r = buildNqiTrend([row('2026-06', 5, 0, 0, 0, 10000)]);
    const fall = r.indicators.find((i) => i.key === 'fall')!;
    expect(fall.trend[0].rate).toBe(0.5);
    expect(fall.trend[0].events).toBe(5);
  });

  it('累计例数 / 最近月率 / 平均率 计算正确', () => {
    const r = buildNqiTrend([
      // fall: 1 例 / 10000 = 0.1‰
      row('2026-01', 1, 0, 0, 0, 10000),
      // fall: 3 例 / 10000 = 0.3‰
      row('2026-02', 3, 0, 0, 0, 10000),
    ]);
    const fall = r.indicators.find((i) => i.key === 'fall')!;
    expect(fall.totalEvents).toBe(4);
    expect(fall.latestRate).toBe(0.3);
    // 平均率 = (0.1 + 0.3) / 2 = 0.2
    expect(fall.avgRate).toBe(0.2);
  });

  it('分母为 0 或缺失 -> 发生率回退为 0，不抛错', () => {
    const r = buildNqiTrend([row('2026-06', 5, 2, 0, 0, 0)]);
    for (const ind of r.indicators) {
      expect(ind.trend[0].rate).toBe(0);
    }
    // 例数仍按原值累计
    const fall = r.indicators.find((i) => i.key === 'fall')!;
    expect(fall.totalEvents).toBe(5);
  });

  it('指标顺序固定为 跌倒/压疮/管路滑脱/给药错误', () => {
    const r = buildNqiTrend([row('2026-06', 1, 1, 1, 1, 10000)]);
    expect(r.indicators.map((i) => i.key)).toEqual(
      NQI_INDICATORS.map((m) => m.key),
    );
    expect(r.indicators.map((i) => i.key)).toEqual([
      'fall',
      'pressureUlcer',
      'tubeDislodgement',
      'medError',
    ]);
  });
});

describe('listView', () => {
  it('返回演示数据：demo=true、近 12 个月、四类指标齐全', () => {
    const v = listView();
    expect(v.demo).toBe(true);
    expect(v.months).toHaveLength(12);
    expect(v.indicators).toHaveLength(4);
    // 月份升序
    expect(v.months[0] < v.months[v.months.length - 1]).toBe(true);
    // 每个指标都有 12 个趋势点且累计例数 > 0
    for (const ind of v.indicators) {
      expect(ind.trend).toHaveLength(12);
      expect(ind.totalEvents).toBeGreaterThan(0);
    }
  });
});
