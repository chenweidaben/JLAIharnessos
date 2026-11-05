/**
 * 健澜AI原生医院操作系统OS - P4-4 通用限流 + login action 特例 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore as resetAudit, queryEvents } from '../../src/bff/aggregators/auditEventAggregator';
import { __resetStore as resetLockout, takeReadToken, takeWriteToken } from '../../src/bff/aggregators/loginLockoutAggregator';
import { auditEventHook } from '../../src/bff/middleware/auditEventHook';
import { globalRateLimit } from '../../src/bff/middleware/globalRateLimit';
import type { Ctx } from '../../src/bff/types';

beforeEach(() => { resetAudit(); resetLockout(); });

function makeCtx(opts: { method: string; url: string; user?: { id: string; name: string; roles: string[] } | null; rawBody?: string; ip?: string; xff?: string }): Ctx {
  const headers = new Headers();
  headers.set('user-agent', 'test-agent');
  if (opts.xff) headers.set('x-forwarded-for', opts.xff);
  return {
    req: { method: opts.method, url: `http://internal${opts.url}`, headers } as unknown as Request,
    params: {},
    query: new URLSearchParams(),
    clientIp: opts.ip ?? '127.0.0.1',
    rawBody: opts.rawBody ?? null,
    body: async () => ({}),
    user: opts.user ?? null,
    traceId: 'trc-test',
  } as unknown as Ctx;
}

describe('P4-4 通用限流桶', async () => {
  test('read 100/min 内放行', async () => {
    for (let i = 0; i < 100; i++) expect(takeReadToken('1.2.3.5')).toBeNull();
  });
  test('read >100 → 返回复试秒数', async () => {
    for (let i = 0; i < 100; i++) takeReadToken('1.2.3.6');
    expect(takeReadToken('1.2.3.6')).not.toBeNull();
  });
  test('write 30/min 内放行，第 31 次 429', async () => {
    for (let i = 0; i < 30; i++) expect(takeWriteToken('1.2.3.7')).toBeNull();
    expect(takeWriteToken('1.2.3.7')).not.toBeNull();
  });
  test('globalRateLimit 白名单 /health 不限', async () => {
    const r = globalRateLimit(makeCtx({ method: 'GET', url: '/health', ip: '5.5.5.5' }));
    expect(r).toBeNull();
  });
  test('globalRateLimit /api/v1/audit/* 不限', async () => {
    const r = globalRateLimit(makeCtx({ method: 'GET', url: '/api/v1/audit/events', ip: '5.5.5.5' }));
    expect(r).toBeNull();
  });
  test('globalRateLimit 非 /api/v1/ 前缀不拦', async () => {
    const r = globalRateLimit(makeCtx({ method: 'POST', url: '/ws/chat', ip: '5.5.5.5' }));
    expect(r).toBeNull();
  });
});

describe('P4-4 本机回环免流门控（反代安全）', async () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedDemo = process.env.DEMO_MODE;
  const savedProxy = process.env.TRUST_PROXY;
  afterEach(() => {
    process.env.NODE_ENV = savedNodeEnv;
    process.env.DEMO_MODE = savedDemo;
    process.env.TRUST_PROXY = savedProxy;
  });
  test('开发+无代理 → 127.0.0.1 免流', async () => {
    process.env.NODE_ENV = 'development'; delete process.env.DEMO_MODE; delete process.env.TRUST_PROXY;
    expect(globalRateLimit(makeCtx({ method: 'GET', url: '/api/v1/worm/segments', ip: '127.0.0.1' }))).toBeNull();
  });
  test('DEMO_MODE=1+无代理 → 127.0.0.1 免流', async () => {
    delete process.env.NODE_ENV; process.env.DEMO_MODE = '1'; delete process.env.TRUST_PROXY;
    expect(globalRateLimit(makeCtx({ method: 'GET', url: '/api/v1/worm/segments', ip: '::ffff:127.0.0.1' }))).toBeNull();
  });
  test('生产（NODE_ENV=production）→ 127.0.0.1 仍受限流', async () => {
    process.env.NODE_ENV = 'production'; delete process.env.DEMO_MODE; delete process.env.TRUST_PROXY;
    const ctx = makeCtx({ method: 'GET', url: '/api/v1/worm/segments', ip: '127.0.0.1' });
    // 连续打 101 次，第 101 次应 429
    let last: Response | null = null;
    for (let i = 0; i < 101; i++) last = globalRateLimit(ctx);
    expect(last).not.toBeNull();
    expect(last!.status).toBe(429);
  });
  test('TRUST_PROXY=1（反代）→ 127.0.0.1 仍受限流', async () => {
    process.env.NODE_ENV = 'development'; delete process.env.DEMO_MODE; process.env.TRUST_PROXY = '1';
    const ctx = makeCtx({ method: 'GET', url: '/api/v1/worm/segments', ip: '127.0.0.1' });
    let last: Response | null = null;
    for (let i = 0; i < 101; i++) last = globalRateLimit(ctx);
    expect(last).not.toBeNull();
    expect(last!.status).toBe(429);
  });
  test('带 X-Forwarded-For 头（即使未设 TRUST_PROXY）→ 127.0.0.1 仍受限流', async () => {
    // 安全项：攻击者直连 app 并伪造 XFF: 127.0.0.1 不能绕过免流
    process.env.NODE_ENV = 'development'; delete process.env.DEMO_MODE; delete process.env.TRUST_PROXY;
    const ctx = makeCtx({ method: 'GET', url: '/api/v1/worm/segments', ip: '127.0.0.1', xff: '127.0.0.1' });
    let last: Response | null = null;
    for (let i = 0; i < 101; i++) last = globalRateLimit(ctx);
    expect(last).not.toBeNull();
    expect(last!.status).toBe(429);
  });
});

describe('P4-4 login action 特例', async () => {
  test('POST /auth/login → action=login（不是 create）', async () => {
    await auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/auth/login', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: '{"username":"D1","password":"x"}' }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('login');
  });
  test('POST /auth/demo-login → action=login', async () => {
    await auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/auth/demo-login', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('login');
  });
  test('POST /auth/logout → action=logout', async () => {
    await auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/auth/logout', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('logout');
  });
  test('普通 POST 仍记 create', async () => {
    await auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('create');
  });
});

describe('P4-4 patientId 从 body 提取', async () => {
  test('body 含 patientId → 审计带 patientId', async () => {
    await auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: '{"patientId":"P-123","drug":"warfarin"}' }), status: 200 });
    expect(queryEvents({}).rows[0].patientId).toBe('P-123');
  });
  test('body 无 patientId → 不崩，patientId 为 undefined', async () => {
    await auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: '{"drug":"warfarin"}' }), status: 200 });
    expect(queryEvents({}).rows[0].patientId).toBeUndefined();
  });
  test('body 非法 JSON → 不崩', async () => {
    await auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: 'not-json' }), status: 200 });
    expect(queryEvents({}).total).toBe(1);
  });
});
