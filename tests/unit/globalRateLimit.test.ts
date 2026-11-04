/**
 * 健澜AI原生医院操作系统OS - P4-4 通用限流 + login action 特例 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore as resetAudit, queryEvents } from '../../src/bff/aggregators/auditEventAggregator';
import { __resetStore as resetLockout, takeReadToken, takeWriteToken } from '../../src/bff/aggregators/loginLockoutAggregator';
import { auditEventHook } from '../../src/bff/middleware/auditEventHook';
import { globalRateLimit } from '../../src/bff/middleware/globalRateLimit';
import type { Ctx } from '../../src/bff/types';

beforeEach(() => { resetAudit(); resetLockout(); });

function makeCtx(opts: { method: string; url: string; user?: { id: string; name: string; roles: string[] } | null; rawBody?: string; ip?: string }): Ctx {
  const headers = new Headers();
  headers.set('user-agent', 'test-agent');
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

describe('P4-4 通用限流桶', () => {
  test('read 100/min 内放行', () => {
    for (let i = 0; i < 100; i++) expect(takeReadToken('1.2.3.5')).toBeNull();
  });
  test('read >100 → 返回复试秒数', () => {
    for (let i = 0; i < 100; i++) takeReadToken('1.2.3.6');
    expect(takeReadToken('1.2.3.6')).not.toBeNull();
  });
  test('write 30/min 内放行，第 31 次 429', () => {
    for (let i = 0; i < 30; i++) expect(takeWriteToken('1.2.3.7')).toBeNull();
    expect(takeWriteToken('1.2.3.7')).not.toBeNull();
  });
  test('globalRateLimit 白名单 /health 不限', () => {
    const r = globalRateLimit(makeCtx({ method: 'GET', url: '/health', ip: '5.5.5.5' }));
    expect(r).toBeNull();
  });
  test('globalRateLimit /api/v1/audit/* 不限', () => {
    const r = globalRateLimit(makeCtx({ method: 'GET', url: '/api/v1/audit/events', ip: '5.5.5.5' }));
    expect(r).toBeNull();
  });
  test('globalRateLimit 非 /api/v1/ 前缀不拦', () => {
    const r = globalRateLimit(makeCtx({ method: 'POST', url: '/ws/chat', ip: '5.5.5.5' }));
    expect(r).toBeNull();
  });
});

describe('P4-4 login action 特例', () => {
  test('POST /auth/login → action=login（不是 create）', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/auth/login', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: '{"username":"D1","password":"x"}' }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('login');
  });
  test('POST /auth/demo-login → action=login', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/auth/demo-login', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('login');
  });
  test('POST /auth/logout → action=logout', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/auth/logout', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('logout');
  });
  test('普通 POST 仍记 create', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] } }), status: 200 });
    expect(queryEvents({}).rows[0].action).toBe('create');
  });
});

describe('P4-4 patientId 从 body 提取', () => {
  test('body 含 patientId → 审计带 patientId', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: '{"patientId":"P-123","drug":"warfarin"}' }), status: 200 });
    expect(queryEvents({}).rows[0].patientId).toBe('P-123');
  });
  test('body 无 patientId → 不崩，patientId 为 undefined', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: '{"drug":"warfarin"}' }), status: 200 });
    expect(queryEvents({}).rows[0].patientId).toBeUndefined();
  });
  test('body 非法 JSON → 不崩', () => {
    auditEventHook({ ctx: makeCtx({ method: 'POST', url: '/api/v1/cds/checks/medication', user: { id: 'D1', name: 'x', roles: ['doctor'] }, rawBody: 'not-json' }), status: 200 });
    expect(queryEvents({}).total).toBe(1);
  });
});
