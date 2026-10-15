/**
 * 健澜科技 jlmedaios - M132-C 系统日志纯函数单测（产品化收尾）
 *
 * 覆盖：
 *  - logSystem：level 归一 / 非法值兜底 info / message 截断 / metadata 安全序列化 /
 *    now 与 id 可注入 / staffId 透传；
 *  - queryLogs：按 level 精确过滤 / module 与 message 关键字大小写不敏感包含 /
 *    时间窗闭区间 / 时间倒序 / 分页边界（page<1、pageSize<=0、越界页、上限钳制）/
 *    空数组与非法入参兜底。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  logSystem,
  normalizeLevel,
  queryLogs,
  sanitizeMetadata,
  type LogEntry,
  type LogLevel,
} from '../../src/bff/aggregators/systemLogAggregator';

/** 便捷构造一条日志记录 */
function make(partial: Partial<LogEntry> & { id: number; level: LogLevel }): LogEntry {
  return {
    module: 'auth',
    message: 'login ok',
    metadata: {},
    staffId: '',
    createdAt: '2026-10-16T09:00:00+08:00',
    ...partial,
  };
}

describe('normalizeLevel', () => {
  it('接受四档合法级别（大小写归一）', () => {
    expect(normalizeLevel('DEBUG')).toBe('debug');
    expect(normalizeLevel('Info')).toBe('info');
    expect(normalizeLevel('WARN')).toBe('warn');
    expect(normalizeLevel('error')).toBe('error');
  });

  it('非法值 / 空值兜底为 info（保证 DB CHECK 约束不被违反）', () => {
    expect(normalizeLevel('fatal')).toBe('info');
    expect(normalizeLevel('')).toBe('info');
    expect(normalizeLevel(undefined)).toBe('info');
    expect(normalizeLevel(null)).toBe('info');
  });
});

describe('logSystem', () => {
  it('把入参塑形为 LogEntry，level 归一、module/message trim', () => {
    const e = logSystem(
      'WARN',
      '  billing  ',
      '  账单同步完成  ',
      { orderId: 'O123' },
      { id: 1, now: '2026-10-16T09:00:00+08:00', staffId: 'u_admin' },
    );
    expect(e).toMatchObject({
      id: 1,
      level: 'warn',
      module: 'billing',
      message: '账单同步完成',
      staffId: 'u_admin',
      createdAt: '2026-10-16T09:00:00+08:00',
    });
    expect(e.metadata).toEqual({ orderId: 'O123' });
  });

  it('message 超长时截断（生产安全加固：防日志表膨胀）', () => {
    const long = 'a'.repeat(2000);
    const e = logSystem('info', 'x', long, undefined, { id: 2 });
    expect(e.message.length).toBe(500);
    expect(e.message.endsWith('…')).toBe(true);
  });

  it('非法 level 兜底为 info', () => {
    const e = logSystem('fatal', 'x', 'boom', undefined, { id: 3 });
    expect(e.level).toBe('info');
  });

  it('metadata 为 undefined 时返回空对象', () => {
    const e = logSystem('info', 'x', 'm', undefined, { id: 4 });
    expect(e.metadata).toEqual({});
  });

  it('id 未注入时由模块级临时计数器分配（单调递增）', () => {
    const a = logSystem('info', 'x', 'm1');
    const b = logSystem('info', 'x', 'm2');
    expect(b.id).toBeGreaterThan(a.id);
  });
});

describe('sanitizeMetadata', () => {
  it('剔除函数与 Symbol，保留标量与嵌套对象', () => {
    const out = sanitizeMetadata({
      a: 1,
      b: 'x',
      fn: () => 1,
      sym: Symbol('s'),
      nested: { k: 'v' },
    });
    expect(out).toEqual({ a: 1, b: 'x', nested: { k: 'v' } });
  });

  it('Error 转为可读字符串，Date 转为 ISO', () => {
    const out = sanitizeMetadata({ err: new Error('db down'), at: new Date('2026-01-01T00:00:00Z') });
    expect(String(out.err)).toContain('db down');
    expect(out.at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('循环引用兜底为 [Circular]，不抛异常', () => {
    const circ: Record<string, unknown> = { a: 1 };
    circ.self = circ;
    expect(() => sanitizeMetadata(circ)).not.toThrow();
  });
});

describe('queryLogs', () => {
  const logs: LogEntry[] = [
    make({ id: 1, level: 'error', module: 'billing', message: '账单同步失败', createdAt: '2026-10-16T10:00:00+08:00' }),
    make({ id: 2, level: 'warn', module: 'auth', message: '登录失败密码错误', createdAt: '2026-10-16T09:30:00+08:00' }),
    make({ id: 3, level: 'info', module: 'auth', message: '登录成功', createdAt: '2026-10-16T09:00:00+08:00' }),
    make({ id: 4, level: 'debug', module: 'scheduler', message: '定时任务 tick', createdAt: '2026-10-15T23:00:00+08:00' }),
    make({ id: 5, level: 'error', module: 'gateway', message: '上游 5xx', createdAt: '2026-10-15T22:00:00+08:00' }),
  ];

  it('无过滤时返回全量，按时间倒序', () => {
    const r = queryLogs(logs, {}, 1, 20);
    expect(r.total).toBe(5);
    expect(r.items.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('按 level 精确过滤', () => {
    const r = queryLogs(logs, { level: 'error' }, 1, 20);
    expect(r.total).toBe(2);
    expect(r.items.map((l) => l.id).sort()).toEqual([1, 5]);
  });

  it('按 module 包含匹配（大小写不敏感）', () => {
    const r = queryLogs(logs, { module: 'AUTH' }, 1, 20);
    expect(r.total).toBe(2);
    expect(r.items.every((l) => l.module === 'auth')).toBe(true);
  });

  it('按 message 关键字包含匹配（大小写不敏感）', () => {
    const r = queryLogs(logs, { keyword: '登录' }, 1, 20);
    expect(r.total).toBe(2);
    expect(r.items.every((l) => l.message.includes('登录'))).toBe(true);
  });

  it('时间窗为闭区间：startTime/endTime 边界包含', () => {
    const r = queryLogs(
      logs,
      { startTime: '2026-10-16T09:00:00+08:00', endTime: '2026-10-16T09:30:00+08:00' },
      1,
      20,
    );
    expect(r.total).toBe(2);
    expect(r.items.map((l) => l.id).sort()).toEqual([2, 3]);
  });

  it('分页：第 1 页 2 条、第 2 页 3 条', () => {
    const p1 = queryLogs(logs, {}, 1, 2);
    expect(p1.items.map((l) => l.id)).toEqual([1, 2]);
    expect(p1.total).toBe(5);
    const p2 = queryLogs(logs, {}, 2, 2);
    expect(p2.items.map((l) => l.id)).toEqual([3, 4]);
    const p3 = queryLogs(logs, {}, 3, 2);
    expect(p3.items.map((l) => l.id)).toEqual([5]);
  });

  it('越界页返回空 items，但 total 仍为过滤后总数', () => {
    const r = queryLogs(logs, {}, 99, 20);
    expect(r.total).toBe(5);
    expect(r.items).toEqual([]);
  });

  it('page < 1 归一为 1；pageSize <= 0 归一为 20', () => {
    const r = queryLogs(logs, {}, 0, 0);
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.items).toHaveLength(5);
  });

  it('pageSize 上限钳制为 200，避免恶意大分页拖垮内存', () => {
    const r = queryLogs(logs, {}, 1, 9999);
    expect(r.pageSize).toBe(200);
  });

  it('空数组 / 非数组入参安全返回空页', () => {
    expect(queryLogs([], {}, 1, 20)).toEqual({ total: 0, page: 1, pageSize: 20, items: [] });
    // @ts-expect-error 故意传非数组以验证运行时兜底
    expect(queryLogs(null, {}, 1, 20).items).toEqual([]);
  });
});
