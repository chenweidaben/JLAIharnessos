/**
 * 健澜AI原生医院操作系统OS - P4-1 全链路审计日志 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore, __tamper, AuditError,
  recordEvent, queryEvents, exportCsv, verifyChain,
} from '../../src/bff/aggregators/auditEventAggregator';

beforeEach(() => { __resetStore(); });

function seedN(n: number, actor = 'D1', mod = 'cpoe', act = 'create', res = 'success') {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(recordEvent({
      actorId: actor + (i % 2), actorRole: 'doctor', action: act, module: mod,
      resourceType: 'order', resourceId: `O-${i}`, result: res,
      occurredAt: `2026-11-0${(i % 9) + 1}T08:00:00Z`,
    }));
  }
  return out;
}

describe('P4-1 哈希链', () => {
  test('创世 event prevHash=GENESIS', () => {
    const e = recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'login', module: 'auth', resourceType: 'session', resourceId: 'S1', result: 'success' });
    expect(e.prevHash).toBe('GENESIS');
    expect(e.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(e.seq).toBe(1);
  });
  test('第二条 prevHash = 第一条 hash', () => {
    const a = recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'login', module: 'auth', resourceType: 'session', resourceId: 'S1', result: 'success' });
    const b = recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'logout', module: 'auth', resourceType: 'session', resourceId: 'S1', result: 'success' });
    expect(b.prevHash).toBe(a.hash);
  });
  test('verify-chain 全绿（N 条）', () => {
    seedN(20);
    const v = verifyChain();
    expect(v.valid).toBe(true);
    expect(v.totalEvents).toBe(20);
  });
  test('篡改一条 → verify 失败返回 brokenAt', () => {
    seedN(10);
    __tamper(5, { result: 'failure' });
    const v = verifyChain();
    expect(v.valid).toBe(false);
    expect(v.brokenAt).toBe(5);
  });
  test('篡改 prevHash 链也会被检测', () => {
    seedN(5);
    __tamper(3, { prevHash: 'deadbeef' });
    const v = verifyChain();
    expect(v.valid).toBe(false);
    expect(v.brokenAt).toBe(3);
  });
});

describe('P4-1 校验', () => {
  test('action 白名单', () => {
    expect(() => recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'hack' as any, module: 'cpoe', resourceType: 'x', resourceId: '1', result: 'success' })).toThrow(/action/);
  });
  test('result 白名单', () => {
    expect(() => recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'login', module: 'auth', resourceType: 's', resourceId: '1', result: 'partial' as any })).toThrow(/result/);
  });
  test('actorRole 白名单', () => {
    expect(() => recordEvent({ actorId: 'D1', actorRole: 'robot' as any, action: 'login', module: 'auth', resourceType: 's', resourceId: '1', result: 'success' })).toThrow(/actorRole/);
  });
  test('必填字段', () => {
    expect(() => recordEvent({ actorId: '', actorRole: 'doctor', action: 'login', module: 'auth', resourceType: 's', resourceId: '1', result: 'success' })).toThrow(/actorId/);
  });
});

describe('P4-1 查询', () => {
  test('actorId 过滤', () => {
    seedN(4, 'D1');
    seedN(3, 'D2');
    expect(queryEvents({ actorId: 'D10' }).total).toBe(2);
    expect(queryEvents({ actorId: 'D21' }).total).toBe(1);
  });
  test('module 过滤', () => {
    seedN(3, 'D1', 'cpoe');
    seedN(2, 'D2', 'emr');
    expect(queryEvents({ module: 'cpoe' }).total).toBe(3);
    expect(queryEvents({ module: 'emr' }).total).toBe(2);
  });
  test('result 过滤', () => {
    seedN(3, 'D1', 'cpoe', 'create', 'success');
    seedN(2, 'D2', 'cpoe', 'create', 'failure');
    expect(queryEvents({ result: 'success' }).total).toBe(3);
    expect(queryEvents({ result: 'failure' }).total).toBe(2);
  });
  test('时间范围 from/to', () => {
    seedN(10, 'D1', 'cpoe');
    const r = queryEvents({ from: '2026-11-03T00:00:00Z', to: '2026-11-05T23:59:59Z' });
    expect(r.total).toBeGreaterThan(0);
  });
  test('limit/offset 分页', () => {
    seedN(20, 'D1', 'cpoe');
    const r = queryEvents({ limit: 5, offset: 0 });
    expect(r.rows.length).toBe(5);
    expect(r.total).toBe(20);
    const r2 = queryEvents({ limit: 5, offset: 15 });
    expect(r2.rows.length).toBe(5);
  });
  test('patientId 过滤', () => {
    recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'view', module: 'emr', resourceType: 'note', resourceId: 'N1', patientId: 'P1', result: 'success' });
    recordEvent({ actorId: 'D2', actorRole: 'doctor', action: 'view', module: 'emr', resourceType: 'note', resourceId: 'N2', patientId: 'P2', result: 'success' });
    expect(queryEvents({ patientId: 'P1' }).total).toBe(1);
  });
});

describe('P4-1 导出', () => {
  test('exportCsv 含 header 且非空', () => {
    seedN(3, 'D1', 'cpoe');
    const csv = exportCsv();
    expect(csv).toContain('seq,occurredAt,actorId,actorRole,action,module');
    expect(csv.split('\n').length).toBe(4);
  });
});
