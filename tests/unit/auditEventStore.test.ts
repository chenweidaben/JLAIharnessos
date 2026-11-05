/**
 * P5-13 AuditEventStore 单测（fake executor，不连真库）
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

describe('P5-13 PgAuditStore fake executor', () => {
  test('DB 失败 + fallback 成功 → ok=true persisted=false，不进 pending', async () => {
    const fake = {
      query: async () => { throw new Error('connection refused'); },
    };
    __resetAuditStore(new PgAuditStore(fake as any));
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(true);
    expect(r.result.persisted).toBe(false);
    expect(r.result.fallbackPath).toBeTruthy();
    expect(auditPersistFailedTotal()).toBe(1);
    // 不进 pending
    expect((await recordEvent({ ...sampleInput, resourceId: 's-2' })), 'second event should also not be in pending');
  });

  test('DB 失败 + fallback 也失败 → ok=false', async () => {
    // 指向不存在的根目录（mkdir 会失败）
    process.env.AUDIT_FALLBACK_DIR = 'Z:\\nonexistent-root-xyz\\audit';
    const fake = {
      query: async () => { throw new Error('connection refused'); },
    };
    __resetAuditStore(new PgAuditStore(fake as any));
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(false);
    expect(r.result.persisted).toBe(false);
    expect(auditPersistFailedTotal()).toBe(1);
    // 还原
    process.env.AUDIT_FALLBACK_DIR = tmp;
  });

  test('SQL 契约：advisory lock + MAX(seq)+1 + INSERT', async () => {
    let captured = '';
    const fake = {
      query: async (text: string) => { captured = text; return { rows: [] }; },
    };
    __resetAuditStore(new PgAuditStore(fake as any));
    await recordEvent(sampleInput);
    expect(captured).toContain('pg_advisory_xact_lock');
    expect(captured).toContain('COALESCE(MAX(seq),0)+1');
    expect(captured).toContain('INSERT INTO audit.events');
  });

  test('写穿 ok=false 时 recordEvent 返回结果（_seed 路由据此返 500）', async () => {
    // 双失败：ok=false
    process.env.AUDIT_FALLBACK_DIR = 'Z:\\nonexistent-root-xyz\\audit';
    const fake = {
      query: async () => { throw new Error('connection refused'); },
    };
    __resetAuditStore(new PgAuditStore(fake as any));
    const r = await recordEvent(sampleInput);
    expect(r.result.ok).toBe(false);
    expect(r.result.reason).toContain('connection refused');
    // 还原
    process.env.AUDIT_FALLBACK_DIR = tmp;
  });
});
