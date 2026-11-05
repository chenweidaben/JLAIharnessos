/**
 * P5-13 AuditEventStore 单测（fake executor 模拟 postgres.js 模板标签形态，不连真库）
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MemoryAuditStore, PgAuditStore, __resetAuditStore, __resetAuditMetrics, auditPersistFailedTotal,
} from '../../src/bff/aggregators/auditEventStore';
import { __resetStore, recordEvent } from '../../src/bff/aggregators/auditEventAggregator';

const ORIG_FALLBACK = process.env.AUDIT_FALLBACK_DIR;
const tmp = mkdtempSync(join(tmpdir(), 'audit-fb-'));
afterAll(() => {
  if (ORIG_FALLBACK === undefined) delete process.env.AUDIT_FALLBACK_DIR;
  else process.env.AUDIT_FALLBACK_DIR = ORIG_FALLBACK;
  rmSync(tmp, { recursive: true, force: true });
});
beforeEach(() => {
  process.env.AUDIT_FALLBACK_DIR = tmp;
  __resetStore();
  __resetAuditMetrics();
  __resetAuditStore(null);
});

const sampleInput = {
  actorId: 'zhangsan',
  actorRole: 'admin' as const,
  action: 'login' as const,
  module: 'auth',
  resourceType: 'session',
  resourceId: 's-1',
  result: 'success' as const,
  ip: '127.0.0.1',
  userAgent: 'test',
};

/**
 * 模拟 postgres.js 的 sql`...` 模板标签：
 *  - sql(strings, ...values) 调用返回 []（可定制 throwOn）
 *  - sql.begin(cb) 直接回调同一 fake
 *  - sql.join(parts, sep) 简单字符串拼接
 * 任何 .query() 调用都会立刻 TypeError，确保生产代码不退回错误形态。
 */
function makeFakeSql(opts: { throwOnTemplate?: boolean; capturedSql?: string[] } = {}) {
  const sql = ((strings: TemplateStringsArray | string, ..._values: unknown[]) => {
    if (typeof strings === 'string') return strings; // join 兜底
    if (opts.capturedSql) opts.capturedSql.push(strings.join('?'));
    if (opts.throwOnTemplate) throw new Error('connection refused');
    return [] as any[];
  }) as any;
  sql.begin = async (cb: any) => cb(sql);
  sql.join = (parts: any[], sep: string) => parts.map((p) => (typeof p === 'string' ? p : '')).filter(Boolean).join(sep);
  sql.cursor = (_batch: number) => {
    return async function* () { /* empty */ };
  };
  return sql;
}

describe('P5-13 MemoryAuditStore 写穿', () => {
  test('写穿成功 → ok=true persisted=true，进 pending 池', async () => {
    const mem = new MemoryAuditStore();
    __resetAuditStore(mem);
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(true);
    expect(r.result.persisted).toBe(true);
    expect(mem.all().length).toBe(1);
  });
});

describe('P5-13 PgAuditStore fake executor（模板标签形态）', () => {
  test('DB 失败 + fallback 成功 → ok=true persisted=false，不进 pending', async () => {
    const sql = makeFakeSql({ throwOnTemplate: true });
    __resetAuditStore(new PgAuditStore(sql));
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(true);
    expect(r.result.persisted).toBe(false);
    expect(r.result.fallbackPath).toBeTruthy();
    expect(auditPersistFailedTotal()).toBe(1);
  });

  test('DB 失败 + fallback 也失败 → ok=false', async () => {
    process.env.AUDIT_FALLBACK_DIR = 'Z:\\nonexistent-root-xyz\\audit';
    const sql = makeFakeSql({ throwOnTemplate: true });
    __resetAuditStore(new PgAuditStore(sql));
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(false);
    expect(r.result.persisted).toBe(false);
    expect(auditPersistFailedTotal()).toBe(1);
    process.env.AUDIT_FALLBACK_DIR = tmp;
  });

  test('SQL 契约：advisory lock + MAX(seq)+1 + INSERT（模板拼接）', async () => {
    const captured: string[] = [];
    const sql = makeFakeSql({ capturedSql: captured });
    __resetAuditStore(new PgAuditStore(sql));
    await recordEvent(sampleInput);
    // begin 内的 tx`...` 会把 strings 拼出来
    const all = captured.join('\n');
    expect(all).toContain('pg_advisory_xact_lock');
    expect(all).toContain('COALESCE(MAX(seq),0)+1');
    expect(all).toContain('INSERT INTO audit.events');
  });

  test('fake 没有 .query 方法 → 若误用立刻 TypeError（防止退回错误 API）', async () => {
    const sql = makeFakeSql();
    expect(typeof sql.query).toBe('undefined');
    // 正常 append 不抛（因为用的是模板标签）
    __resetAuditStore(new PgAuditStore(sql));
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(true);
  });

  test('写穿 ok=false 时 recordEvent 返回结果（_seed 路由据此返 500）', async () => {
    process.env.AUDIT_FALLBACK_DIR = 'Z:\\nonexistent-root-xyz\\audit';
    const sql = makeFakeSql({ throwOnTemplate: true });
    __resetAuditStore(new PgAuditStore(sql));
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(false);
    expect(r.result.reason).toContain('connection refused');
    process.env.AUDIT_FALLBACK_DIR = tmp;
  });
});

describe('P5-13 启动回填边界（lastArchivedSeq）', () => {
  test('backfillPending(6) 只回填 seq>6 的事件，首条 seq===7', async () => {
    // 模拟 Memory store 里已有 seq 1..9
    const mem = new MemoryAuditStore();
    __resetStore();
    __resetAuditStore(mem);
    // 手动造 9 条事件（不经过 recordEvent 的 seq 分配）
    const fake = [1,2,3,4,5,6,7,8,9].map((n) => ({
      eventId: `e-${n}`, seq: n, occurredAt: '2026-11-06T00:00:00Z',
      actorId: 'zhangsan', actorRole: 'admin', action: 'login', module: 'auth',
      resourceType: 'session', resourceId: `s-${n}`, result: 'success',
      ip: '127.0.0.1', userAgent: 't', prevHash: 'h', hash: 'h',
    })) as any;
    // 直接灌进 store.rows（绕过 recordEvent）
    (mem as any).rows = [...fake];
    // backfill 只取 seq > 6
    const { backfillPending, getPendingEvents } = await import('../../src/bff/aggregators/auditEventAggregator');
    const n = await backfillPending(6);
    expect(n).toBe(3);
    const pending = getPendingEvents();
    expect(pending.length).toBe(3);
    expect(pending[0].seq).toBe(7);
    expect(pending[2].seq).toBe(9);
  });

  test('backfillPending(0) 时 lastArchivedSeq=0 → 全部回填（首段场景）', async () => {
    const mem = new MemoryAuditStore();
    __resetStore();
    __resetAuditStore(mem);
    (mem as any).rows = [1,2,3].map((n) => ({
      eventId: `e-${n}`, seq: n, occurredAt: '2026-11-06T00:00:00Z',
      actorId: 'zhangsan', actorRole: 'admin', action: 'login', module: 'auth',
      resourceType: 'session', resourceId: `s-${n}`, result: 'success',
      ip: '127.0.0.1', userAgent: 't', prevHash: 'h', hash: 'h',
    })) as any;
    const { backfillPending, getPendingEvents } = await import('../../src/bff/aggregators/auditEventAggregator');
    const n = await backfillPending(0);
    expect(n).toBe(3);
    expect(getPendingEvents()[0].seq).toBe(1);
  });
});
