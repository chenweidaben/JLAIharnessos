/**
 * 健澜AI原生医院操作系统OS - P4-2 审计中间件全局埋点 单测
 *
 * 用伪造 Ctx 直接调 auditEventHook，验证 after-hook 过滤/提取/映射逻辑。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore, queryEvents } from '../../src/bff/aggregators/auditEventAggregator';
import { auditEventHook } from '../../src/bff/middleware/auditEventHook';
import type { Ctx } from '../../src/bff/types';

beforeEach(() => { __resetStore(); });

function makeCtx(opts: { method: string; url: string; user?: { id: string; name: string; roles: string[] } | null }): Ctx {
  const headers = new Headers();
  headers.set('user-agent', 'test-agent');
  // 用最小化 req 桩（避免 Bun new Request 对 POST 无 body 抛错）
  const fakeReq = {
    method: opts.method,
    url: `http://internal${opts.url}`,
    headers,
  };
  return {
    req: fakeReq as unknown as Request,
    params: {},
    query: new URLSearchParams(),
    clientIp: '127.0.0.1',
    rawBody: null,
    body: async () => ({}),
    user: opts.user ?? null,
    traceId: 'trc-test',
  } as unknown as Ctx;
}

describe('P4-2 after-hook 过滤', () => {
  test('GET 请求不记录', () => {
    auditEventHook({ ctx: makeCtx({ method: 'GET', url: '/api/v1/cds/checks', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).total).toBe(0);
  });
  test('HEAD/OPTIONS 不记录', () => {
    auditEventHook({ ctx: makeCtx({ method: 'HEAD', url: '/api/v1/cds/checks' }), status: 200 });
    auditEventHook({ ctx: makeCtx({ method: 'OPTIONS', url: '/api/v1/cds/checks' }), status: 200 });
    expect(queryEvents({}).total).toBe(0);
  });
  test('/api/v1/audit/ 自身不递归', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/audit/events/_seed', user: { id: 'admin', name: 'a', roles: ['admin'] } }), status: 200 });
    expect(queryEvents({}).total).toBe(0);
  });
  test('/health /metrics 不记录', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/health' }), status: 200 });
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/metrics' }), status: 200 });
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/health' }), status: 200 });
    expect(queryEvents({}).total).toBe(0);
  });
  test('非 /api/v1/ 前缀不记录', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/ws/chat' }), status: 200 });
    expect(queryEvents({}).total).toBe(0);
  });
});

describe('P4-2 after-hook 映射', () => {
  test('POST → action=create, module=cds', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    const r = queryEvents({});
    expect(r.total).toBe(1);
    expect(r.rows[0].action).toBe('create');
    expect(r.rows[0].module).toBe('cds');
    expect(r.rows[0].resourceType).toBe('checks');
  });
  test('PUT/PATCH → action=update', () => {
    auditEventHook({ ctx: makeCtx({ method: 'PUT', url: '/api/v1/emr/notes/N123', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('update');
    expect(queryEvents({}).rows[0].resourceId).toBe('N123');
  });
  test('DELETE → action=delete', () => {
    auditEventHook({ ctx: makeCtx({ method: 'DELETE', url: '/api/v1/pharmacy/orders/O1', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('delete');
  });
  test('200 → result=success', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].result).toBe('success');
  });
  test('403 → result=forbidden + actorId=doctor', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 403 });
    const e = queryEvents({}).rows[0];
    expect(e.result).toBe('forbidden');
    expect(e.errorCode).toBe('403');
  });
  test('401 无 token → actorId=anonymous, actorRole=system, result=forbidden', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks', user: null }), status: 401 });
    const e = queryEvents({}).rows[0];
    expect(e.actorId).toBe('anonymous');
    expect(e.actorRole).toBe('system');
    expect(e.result).toBe('forbidden');
  });
  test('500 → result=failure', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 500 });
    expect(queryEvents({}).rows[0].result).toBe('failure');
  });
  test('actorRole 从 user.roles[0] 映射', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks', user: { id: 'admin', name: 'a', roles: ['admin'] } }), status: 200 });
    expect(queryEvents({}).rows[0].actorRole).toBe('admin');
  });
});
