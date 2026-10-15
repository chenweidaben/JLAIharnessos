/**
 * 健澜科技 jlmedaios - 详细健康报告纯函数单测
 *
 * 仅覆盖 buildHealthReport（纯函数）：阈值口径、降级判定、学习闭环健康度与空数据兜底。
 * 不触碰 IO / 时钟 / 进程内采集计数器。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildHealthReport,
  ERROR_RATE_DEGRADED_PCT,
  LEARNING_WARNING_RATE,
  SLOW_QUERY_DEGRADED_COUNT,
} from '../../src/bff/aggregators/healthReportAggregator';

describe('buildHealthReport', () => {
  it('空数据兜底：零错误 / 零慢查询 / 零反馈 → healthy，learningHealth=unknown', () => {
    const r = buildHealthReport(0, 0, 0);
    expect(r.status).toBe('healthy');
    expect(r.degraded).toBe(false);
    expect(r.errorRate).toBe(0);
    expect(r.slowQueryCount).toBe(0);
    expect(r.learningHealth).toBe('unknown');
  });

  it('正常水位：错误率 2% / 3 条慢查询 / 反馈率 0.8 → healthy', () => {
    const r = buildHealthReport(2, 3, 0.8);
    expect(r.status).toBe('healthy');
    expect(r.degraded).toBe(false);
    expect(r.errorRate).toBe(2);
    expect(r.slowQueryCount).toBe(3);
    expect(r.learningHealth).toBe('healthy');
  });

  it('错误率超过阈值（>5%）→ degraded', () => {
    const r = buildHealthReport(6.1, 0, 0.9);
    expect(r.degraded).toBe(true);
    expect(r.status).toBe('degraded');
    expect(r.errorRate).toBe(6.1);
  });

  it('慢查询超过阈值（>10 条）→ degraded', () => {
    const r = buildHealthReport(1, 11, 0.9);
    expect(r.degraded).toBe(true);
    expect(r.status).toBe('degraded');
    expect(r.slowQueryCount).toBe(11);
  });

  it('边界值不触发降级：错误率恰好 5%、慢查询恰好 10 条 → healthy（严格大于）', () => {
    const r = buildHealthReport(ERROR_RATE_DEGRADED_PCT, SLOW_QUERY_DEGRADED_COUNT, 0.9);
    expect(r.degraded).toBe(false);
    expect(r.status).toBe('healthy');
  });

  it('两种降级条件同时命中：仍为 degraded', () => {
    const r = buildHealthReport(8, 20, 0.1);
    expect(r.degraded).toBe(true);
    expect(r.status).toBe('degraded');
  });

  it('slowQueries 支持传入数组（取 length）与数值', () => {
    const fromArr = buildHealthReport(1, ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11'], 0.9);
    expect(fromArr.slowQueryCount).toBe(11);
    expect(fromArr.degraded).toBe(true);

    const fromNum = buildHealthReport(1, 4, 0.9);
    expect(fromNum.slowQueryCount).toBe(4);
    expect(fromNum.degraded).toBe(false);
  });

  it('学习闭环健康度：>=0.3 healthy，<0.3 warning，<=0/NaN unknown；不影响降级', () => {
    const healthy = buildHealthReport(1, 1, 0.5);
    expect(healthy.learningHealth).toBe('healthy');

    const warn = buildHealthReport(1, 1, LEARNING_WARNING_RATE - 0.05);
    expect(warn.learningHealth).toBe('warning');

    const none = buildHealthReport(1, 1, Number.NaN);
    expect(none.learningHealth).toBe('unknown');

    // 学习健康度 warning 单独出现时不触发降级
    expect(warn.degraded).toBe(false);
    expect(warn.status).toBe('healthy');
  });

  it('非法输入兜底：NaN 错误率 / 负数慢查询 / 非法反馈率 → 归一化不崩', () => {
    const r = buildHealthReport(Number.NaN, -5, Number.NaN);
    expect(r.errorRate).toBe(0);
    expect(r.slowQueryCount).toBe(0);
    expect(r.learningHealth).toBe('unknown');
    expect(r.degraded).toBe(false);
    expect(r.status).toBe('healthy');
  });
});
