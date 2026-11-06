/**
 * 健澜AI原生医院操作系统OS - P5-16 backfill 截断 fail-closed 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { MemoryAuditStore, __resetAuditStore } from '../../src/bff/aggregators/auditEventStore.js';
import {
  backfillPending, __resetSealDisabled, __sealDisabled,
  type AuditEvent,
} from '../../src/bff/aggregators/auditEventAggregator.js';

function fakeEvent(seq: number): AuditEvent {
  return {
    seq,
    occurredAt: '2026-01-01T00:00:00Z',
    actorId: 'zhangmou',
    actorRole: 'doctor',
    action: 'create',
    module: 'emr',
    resourceType: 'note',
    resourceId: `n-${seq}`,
    patientId: 'p1',
    result: 'success',
    ip: '1.1.1.1',
    userAgent: 'ua',
    prevHash: '0'.repeat(64),
    hash: 'a'.repeat(64),
  } as AuditEvent;
}

afterEach(() => {
  __resetSealDisabled();
  __resetAuditStore(null);
  delete process.env.AUDIT_BACKFILL_LIMIT;
});

describe('backfillPending fail-closed', () => {
  test('total <= limit → truncated=false，不置 sealDisabled', async () => {
    const store = new MemoryAuditStore();
    for (let i = 1; i <= 5; i++) await store.append(fakeEvent(i));
    __resetAuditStore(store);
    const r = await backfillPending(0);
    expect(r.truncated).toBe(false);
    expect(r.filled).toBe(5);
    expect(r.total).toBe(5);
    expect(__sealDisabled()).toBeNull();
  });

  test('total > limit → truncated=true，sealDisabled 置位', async () => {
    const store = new MemoryAuditStore();
    for (let i = 1; i <= 1050; i++) await store.append(fakeEvent(i));
    __resetAuditStore(store);
    process.env.AUDIT_BACKFILL_LIMIT = '1000';
    const r = await backfillPending(0);
    expect(r.truncated).toBe(true);
    expect(r.filled).toBe(1000);
    expect(r.total).toBe(1050);
    const d = __sealDisabled();
    expect(d).not.toBeNull();
    expect(d!.reason).toBe('audit-backfill-truncated');
  });

  test('AUDIT_BACKFILL_LIMIT 非法值抛错', async () => {
    process.env.AUDIT_BACKFILL_LIMIT = 'not-a-number';
    const store = new MemoryAuditStore();
    __resetAuditStore(store);
    // eslint-disable-next-line @typescript-eslint/await-thenable -- bun:test expect().rejects 类型不是 Promise
    await expect(backfillPending(0)).rejects.toThrow(/AUDIT_BACKFILL_LIMIT/);
  });

  test('limit 覆盖后 total<=新limit → truncated=false', async () => {
    const store = new MemoryAuditStore();
    for (let i = 1; i <= 1050; i++) await store.append(fakeEvent(i));
    __resetAuditStore(store);
    process.env.AUDIT_BACKFILL_LIMIT = '2000';
    const r = await backfillPending(0);
    expect(r.truncated).toBe(false);
    expect(r.filled).toBe(1050);
    expect(__sealDisabled()).toBeNull();
  });
});
