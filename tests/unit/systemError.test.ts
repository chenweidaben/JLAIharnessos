/**
 * 健澜科技 jlmedaios - M123-C 系统错误日志纯函数单测（生产安全加固）
 *
 * 覆盖：
 *  - logError（塑形 / 长度截断 / 默认值 / resolved=false / now&id 可注入）；
 *  - aggregateErrors（今日计数 / 7 日趋势轴 / 高频类型 Top5 / 未闭环计数 / 空数据兜底）；
 *  - resolveError（命中标记已闭环 / 不可变更新 / id 未命中原样返回）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  aggregateErrors,
  logError,
  resolveError,
  type SystemError,
} from '../../src/bff/aggregators/systemErrorAggregator';

/** 固定“今天”：2026-10-16 正午，保证今日 / 趋势边界可断言 */
const NOW = new Date('2026-10-16T12:00:00+08:00');

/** 便捷构造一条错误记录 */
function make(partial: Partial<SystemError> & { id: number }): SystemError {
  return {
    errorType: 'UNHANDLED',
    message: 'boom',
    stackTrace: '',
    route: '/api/v1/x',
    staffId: 'u_1',
    createdAt: '2026-10-16T09:00:00+08:00',
    resolved: false,
    ...partial,
  };
}

describe('logError', () => {
  it('把入参塑形为 SystemError，默认 resolved=false', () => {
    const e = logError('DB_DOWN', '连接池耗尽', 'at pool.acquire', '/api/v1/orders', 'u_admin', {
      now: '2026-10-16T09:00:00+08:00',
      id: 1,
    });
    expect(e).toMatchObject({
      id: 1,
      errorType: 'DB_DOWN',
      message: '连接池耗尽',
      stackTrace: 'at pool.acquire',
      route: '/api/v1/orders',
      staffId: 'u_admin',
      createdAt: '2026-10-16T09:00:00+08:00',
      resolved: false,
    });
  });

  it('message / stack 超长时截断（生产安全加固）', () => {
    const longMsg = 'a'.repeat(2000);
    const longStack = 's'.repeat(10000);
    const e = logError('X', longMsg, longStack, '', '', { id: 2, now: '2026-10-16T09:00:00+08:00' });
    expect(e.message.length).toBe(500);
    expect(e.stackTrace.length).toBe(4000);
  });

  it('空 errorType 兜底为 UNHANDLED，空字段落空串', () => {
    const e = logError('', '', '', '', '', { id: 3, now: '2026-10-16T09:00:00+08:00' });
    expect(e.errorType).toBe('UNHANDLED');
    expect(e.message).toBe('');
    expect(e.staffId).toBe('');
  });
});

describe('aggregateErrors', () => {
  it('空数组：今日 0 / 未闭环 0 / 趋势 7 天全零', () => {
    const agg = aggregateErrors([], { now: NOW });
    expect(agg.todayCount).toBe(0);
    expect(agg.unresolved).toBe(0);
    expect(agg.topTypes).toEqual([]);
    expect(agg.trend).toHaveLength(7);
    expect(agg.trend.every((t) => t.count === 0)).toBe(true);
  });

  it('今日计数只统计今天，历史日不计入 todayCount', () => {
    const errors = [
      make({ id: 1, createdAt: '2026-10-16T08:00:00+08:00' }), // 今天
      make({ id: 2, createdAt: '2026-10-16T10:00:00+08:00' }), // 今天
      make({ id: 3, createdAt: '2026-10-10T10:00:00+08:00' }), // 6 天前
    ];
    const agg = aggregateErrors(errors, { now: NOW });
    expect(agg.todayCount).toBe(2);
  });

  it('未闭环计数：resolved=true 的不计入', () => {
    const errors = [
      make({ id: 1, resolved: false }),
      make({ id: 2, resolved: false }),
      make({ id: 3, resolved: true }),
    ];
    const agg = aggregateErrors(errors, { now: NOW });
    expect(agg.unresolved).toBe(2);
  });

  it('topTypes：按次数倒序取前 5', () => {
    const errors = [
      make({ id: 1, errorType: 'DB_DOWN' }),
      make({ id: 2, errorType: 'DB_DOWN' }),
      make({ id: 3, errorType: 'DB_DOWN' }),
      make({ id: 4, errorType: 'TIMEOUT' }),
      make({ id: 5, errorType: 'TIMEOUT' }),
      make({ id: 6, errorType: 'VALIDATION' }),
    ];
    const agg = aggregateErrors(errors, { now: NOW });
    expect(agg.topTypes[0]).toEqual({ errorType: 'DB_DOWN', count: 3 });
    expect(agg.topTypes[1]).toEqual({ errorType: 'TIMEOUT', count: 2 });
    expect(agg.topTypes[2]).toEqual({ errorType: 'VALIDATION', count: 1 });
  });

  it('趋势轴覆盖近 7 天，最旧在前、含今日', () => {
    const errors = [
      make({ id: 1, createdAt: '2026-10-16T08:00:00+08:00' }), // 今天
      make({ id: 2, createdAt: '2026-10-14T08:00:00+08:00' }), // 2 天前
    ];
    const agg = aggregateErrors(errors, { now: NOW });
    expect(agg.trend).toHaveLength(7);
    // 最后一个桶是今天
    expect(agg.trend[agg.trend.length - 1].date).toBe('2026-10-16');
    expect(agg.trend[agg.trend.length - 1].count).toBe(1);
    // 2 天前桶（索引 4 = 7-1-2）
    expect(agg.trend[4].date).toBe('2026-10-14');
    expect(agg.trend[4].count).toBe(1);
  });
});

describe('resolveError', () => {
  it('把命中 id 的错误标记为已闭环', () => {
    const errors = [make({ id: 1 }), make({ id: 2 })];
    const resolved = resolveError(1, errors);
    expect(resolved.find((e) => e.id === 1)?.resolved).toBe(true);
    expect(resolved.find((e) => e.id === 2)?.resolved).toBe(false);
  });

  it('不可变更新：不修改入参数组与命中记录本身', () => {
    const original = make({ id: 1 });
    const errors = [original];
    const resolved = resolveError(1, errors);
    // 入参对象未被改写
    expect(original.resolved).toBe(false);
    // 返回的是新数组（长度一致但非同引用元素）
    expect(resolved).not.toBe(errors);
    expect(resolved[0]).not.toBe(original);
  });

  it('id 未命中时原样返回（不报错）', () => {
    const errors = [make({ id: 1 })];
    const resolved = resolveError(999, errors);
    expect(resolved[0].resolved).toBe(false);
  });
});
