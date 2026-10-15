/**
 * 健澜科技 jlmedaios - M149-D 错误处理与日志完善单测
 *
 * 覆盖：
 *  - formatErrorResponse：生产不下发堆栈 / 5xx 兜底 / 4xx 保持明确 / 内部细节剥离；
 *  - logError：结构化七字段落库、上下文透传、空异常归一；
 *  - getErrorStats：时间窗过滤、分级聚合、错误码 / 路径 TopN、近期明细倒序。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';

import {
  __resetErrorLogBuffer,
  formatErrorResponse,
  getErrorStats,
  logError,
  PROD_FALLBACK_MESSAGE,
} from '../../src/bff/aggregators/errorLoggingAggregator';

/* ------------------------------------------------------------------ */
/* formatErrorResponse：生产环境不泄露堆栈                              */
/* ------------------------------------------------------------------ */

describe('formatErrorResponse - 生产环境', () => {
  it('5xx 统一兜底文案，且响应体不含 stack 字段', () => {
    const err = new Error('connect ECONNREFUSED at Query (C:\\app\\db.ts:44:11)');
    const out = formatErrorResponse(err, 'production');
    expect(out.error.code).toBe(50000);
    expect(out.error.message).toBe(PROD_FALLBACK_MESSAGE);
    expect('stack' in out.error).toBe(false);
  });

  it('401 未登录保持明确语义，不下发堆栈', () => {
    const err = Object.assign(new Error('jwt expired'), { code: 40101 });
    const out = formatErrorResponse(err, 'production');
    expect(out.error.code).toBe(40101);
    expect(out.error.message).toBe('jwt expired');
    expect('stack' in out.error).toBe(false);
  });

  it('4xx message 中的 SQL / 物理路径 / 内网 IP 被剥离', () => {
    const err = Object.assign(
      new Error("bad query SELECT * FROM users at C:\\app\\routes\\x.ts host=10.0.0.8"),
      { code: 40000 },
    );
    const out = formatErrorResponse(err, 'production');
    expect(out.error.code).toBe(40000);
    expect(out.error.message).not.toMatch(/\bSELECT\s+\w+/i);
    expect(out.error.message).not.toMatch(/[A-Za-z]:\\/);
    expect(out.error.message).not.toMatch(/\b10\.0\.0\.8\b/);
  });

  it('null/undefined 异常在生产下也归一为兜底', () => {
    expect(formatErrorResponse(null, 'production').error.message).toBe(PROD_FALLBACK_MESSAGE);
    expect(formatErrorResponse(undefined, 'production').error.message).toBe(PROD_FALLBACK_MESSAGE);
  });
});

/* ------------------------------------------------------------------ */
/* formatErrorResponse：开发环境下发堆栈                                */
/* ------------------------------------------------------------------ */

describe('formatErrorResponse - 开发环境', () => {
  it('Error 实例附带 stack 字段，便于联调定位', () => {
    const err = new Error('boom');
    const out = formatErrorResponse(err, 'development');
    expect(out.error.code).toBe(50000);
    expect(out.error.message).toBe('boom');
    expect(typeof out.error.stack).toBe('string');
    expect(out.error.stack).toContain('boom');
  });

  it('无堆栈对象异常不强行造 stack', () => {
    const out = formatErrorResponse('plain string boom', 'development');
    expect(out.error.code).toBe(50000);
    expect(out.error.message).toBe('plain string boom');
    expect('stack' in out.error).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* logError：结构化日志行                                               */
/* ------------------------------------------------------------------ */

describe('logError - 结构化日志行', () => {
  beforeEach(() => __resetErrorLogBuffer());

  it('七字段齐全：timestamp/level/code/message/path/staffId/patientId', () => {
    const entry = logError(new Error('db down'), {
      path: '/api/v1/admin/errors/stats',
      staffId: 'S001',
      patientId: 'P001',
      level: 'error',
      timestamp: '2026-10-16T11:30:00.000Z',
    });
    expect(entry.timestamp).toBe('2026-10-16T11:30:00.000Z');
    expect(entry.level).toBe('error');
    expect(entry.code).toBe(50000);
    expect(entry.message).toBe('db down');
    expect(entry.path).toBe('/api/v1/admin/errors/stats');
    expect(entry.staffId).toBe('S001');
    expect(entry.patientId).toBe('P001');
  });

  it('默认级别 error，缺省上下文为空串', () => {
    const entry = logError(new Error('unexpected'));
    expect(entry.level).toBe('error');
    expect(entry.path).toBe('');
    expect(entry.staffId).toBe('');
    expect(entry.patientId).toBe('');
    expect(typeof entry.timestamp).toBe('string');
  });

  it('null/undefined 异常归一为 50000，message 非空', () => {
    const entry = logError(null);
    expect(entry.code).toBe(50000);
    expect(entry.message.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* getErrorStats：时间窗过滤 + 聚合                                     */
/* ------------------------------------------------------------------ */

describe('getErrorStats - 时间窗聚合', () => {
  beforeEach(() => __resetErrorLogBuffer());

  it('只统计窗口内日志，旧记录被排除；分级 / 错误码 / 路径聚合正确', () => {
    const now = new Date('2026-10-16T12:00:00.000Z');
    // 窗口外：1 月前的旧记录
    logError(new Error('ancient'), { timestamp: '2026-01-01T00:00:00.000Z', path: '/old' });
    // 窗口内（now-60min ~ now）：3 条
    logError(Object.assign(new Error('db timeout'), { code: 50000 }), {
      timestamp: '2026-10-16T11:30:00.000Z',
      path: '/api/v1/a',
      staffId: 'S001',
    });
    logError(Object.assign(new Error('pool exhausted'), { code: 50000 }), {
      timestamp: '2026-10-16T11:45:00.000Z',
      path: '/api/v1/a',
    });
    logError(Object.assign(new Error('no token'), { code: 40101 }), {
      timestamp: '2026-10-16T11:50:00.000Z',
      path: '/api/v1/b',
      level: 'warn',
    });

    const stats = getErrorStats({ minutes: 60, now });
    expect(stats.total).toBe(3);
    expect(stats.period.from).toBe('2026-10-16T11:00:00.000Z');
    expect(stats.period.to).toBe('2026-10-16T12:00:00.000Z');

    // 分级：2 error + 1 warn
    expect(stats.byLevel.error).toBe(2);
    expect(stats.byLevel.warn).toBe(1);
    expect(stats.byLevel.info).toBe(0);

    // 错误码 Top：50000 x2 在前，40101 x1 在后
    expect(stats.byCode[0]).toEqual({ code: 50000, count: 2 });
    expect(stats.byCode[1]).toEqual({ code: 40101, count: 1 });

    // 路径 Top：/api/v1/a x2 在前
    expect(stats.byPath[0]).toEqual({ path: '/api/v1/a', count: 2 });
    expect(stats.byPath[1]).toEqual({ path: '/api/v1/b', count: 1 });

    // 近期明细按时间倒序：最新（11:50）在第一条
    expect(stats.recent[0].timestamp).toBe('2026-10-16T11:50:00.000Z');
    expect(stats.recent.length).toBe(3);
  });

  it('空缓冲返回全零统计，不假造数据', () => {
    const stats = getErrorStats({ minutes: 60, now: new Date('2026-10-16T12:00:00.000Z') });
    expect(stats.total).toBe(0);
    expect(stats.byLevel).toEqual({ error: 0, warn: 0, info: 0 });
    expect(stats.byCode).toEqual([]);
    expect(stats.byPath).toEqual([]);
    expect(stats.recent).toEqual([]);
  });

  it('非法 minutes 回落默认 60，且上限 1440', () => {
    const now = new Date('2026-10-16T12:00:00.000Z');
    const dft = getErrorStats({ now });
    expect(dft.period.minutes).toBe(60);
    const capped = getErrorStats({ minutes: 99999, now });
    expect(capped.period.minutes).toBe(1440);
  });
});
