/**
 * 健澜AI原生医院操作系统OS - P5-10 WORM keys retire/purge 路由单测
 *
 * 直接构造 Ctx 调用 handler，验证：
 * 1. 无 token → 401
 * 2. 非 admin → 403
 * 3. admin purge 被 2 段引用的 key → 409 + refs===2
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { wormRoutes } from '../../src/bff/routes/worm';
import { getKeyProvider, __resetKeyProvider, DemoEphemeralKeyProvider } from '../../src/bff/aggregators/wormKeyProvider';
import { __resetStore, seal } from '../../src/bff/aggregators/wormArchiveAggregator';
import { recordEvent } from '../../src/bff/aggregators/auditEventAggregator';
import { getWormStore } from '../../src/bff/aggregators/wormStore';

const ORIGINAL_ENV: Record<string, string | undefined> = {
  DEMO_MODE: process.env.DEMO_MODE,
  NODE_ENV: process.env.NODE_ENV,
};
function restoreEnv(key: string): void {
  const v = ORIGINAL_ENV[key];
  if (v === undefined) delete process.env[key];
  else process.env[key] = v;
}
afterAll(() => {
  restoreEnv('DEMO_MODE');
  restoreEnv('NODE_ENV');
});

type Handler = (c: any) => Promise<Response>;

function findHandler(method: string, path: string): Handler {
  const r = wormRoutes.find((x) => x.method === method && x.path === path) as any;
  if (!r) throw new Error(`route not found: ${method} ${path}`);
  return r.handle as Handler;
}

function makeCtx(opts: { user?: { id: string; name: string; roles: string[] } | null; body?: unknown }): any {
  return {
    req: { method: 'POST', url: 'http://internal/api/v1/worm/keys/x', headers: new Headers() },
    params: {},
    query: new URLSearchParams(),
    clientIp: '127.0.0.1',
    rawBody: opts.body ? JSON.stringify(opts.body) : null,
    body: async () => opts.body ?? {},
    user: opts.user ?? null,
    traceId: 'trc-test',
  };
}

beforeEach(() => {
  process.env.DEMO_MODE = '1';
  __resetStore();
  __resetKeyProvider(new DemoEphemeralKeyProvider());
  // 挂真实索引 checker
  getKeyProvider().setKeyInUseChecker((kid: string) => getWormStore().countBySigner(kid));
});

describe('P5-10 keys/retire 路由鉴权', () => {
  test('无 token → 401', async () => {
    const h = findHandler('POST', '/api/v1/worm/keys/retire');
    const c = makeCtx({ user: null, body: { keyId: 'x' } });
    const res = await h(c);
    expect(res.status).toBe(401);
  });

  test('nurse（非 admin）→ 403', async () => {
    const h = findHandler('POST', '/api/v1/worm/keys/retire');
    const c = makeCtx({ user: { id: 'N1', name: '护士', roles: ['nurse'] }, body: { keyId: 'x' } });
    const res = await h(c);
    expect(res.status).toBe(403);
  });
});

describe('P5-10 keys/purge 路由鉴权', () => {
  test('无 token → 401', async () => {
    const h = findHandler('POST', '/api/v1/worm/keys/purge');
    const c = makeCtx({ user: null, body: { keyId: 'x' } });
    const res = await h(c);
    expect(res.status).toBe(401);
  });

  test('nurse（非 admin）→ 403', async () => {
    const h = findHandler('POST', '/api/v1/worm/keys/purge');
    const c = makeCtx({ user: { id: 'N1', name: '护士', roles: ['nurse'] }, body: { keyId: 'x' } });
    const res = await h(c);
    expect(res.status).toBe(403);
  });
});

describe('P5-10 purge 响应无私钥', () => {
  test('purge 不存在的 keyId 响应体不含 privateKey/PRIVATE', async () => {
    const h = findHandler('POST', '/api/v1/worm/keys/purge');
    const c = makeCtx({ user: { id: 'A1', name: 'admin', roles: ['admin'] }, body: { keyId: 'nonexistent-x' } });
    const res = await h(c);
    const txt = await res.text();
    expect(txt).not.toContain('privateKey');
    expect(txt).not.toContain('PRIVATE KEY');
    expect(txt).not.toContain('privateKeyHex');
  });
});

describe('P5-10 keys/purge 真实 refs===2', () => {
  test('admin purge 被恰好 2 段引用的 key → 409 + refs===2', async () => {
    const provider = getKeyProvider();
    // rotate 两次：第一次得到 kNew（active），seal 2 段用它；第二次 rotate 让 kNew 不再 active
    provider.rotate();
    const kNew = provider.activeKeyId();

    // seal 2 段，都用 kNew
    recordEvent({ actorId: 'D1', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n1', result: 'success', ip: '1.1.1.1', userAgent: 'ua' });
    seal({});
    recordEvent({ actorId: 'D2', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n2', result: 'success', ip: '1.1.1.1', userAgent: 'ua' });
    seal({});

    // rotate 让 kNew 不再 active
    provider.rotate();

    // purge kNew：应返回 409 + refs===2
    const h = findHandler('POST', '/api/v1/worm/keys/purge');
    const c = makeCtx({ user: { id: 'A1', name: 'admin', roles: ['admin'] }, body: { keyId: kNew, confirm: 'PURGE' } });
    const res = await h(c);
    expect(res.status).toBe(409);
    const body = await res.json() as any;
    expect(body.error).toBe('key-in-use');
    expect(body.refs).toBe(2);
  });
});

describe('P5-11 purge 二次确认', () => {
  test('缺 confirm → 400 confirm-required', async () => {
    const h = findHandler('POST', '/api/v1/worm/keys/purge');
    const c = makeCtx({ user: { id: 'A1', name: 'admin', roles: ['admin'] }, body: { keyId: 'k-any' } });
    const res = await h(c);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('confirm-required');
  });

  test('confirm 小写 → 400 confirm-required', async () => {
    const h = findHandler('POST', '/api/v1/worm/keys/purge');
    const c = makeCtx({ user: { id: 'A1', name: 'admin', roles: ['admin'] }, body: { keyId: 'k-any', confirm: 'purge' } });
    const res = await h(c);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('confirm-required');
  });

  test('正确 confirm + 零引用 key → 200', async () => {
    const provider = getKeyProvider();
    // rotate 两次拿到一个 retired 且零引用的 keyId
    provider.rotate();
    const kZero = provider.activeKeyId();
    provider.rotate();
    // kZero 不再 active，且没 seal 过任何段 → refs=0
    const h = findHandler('POST', '/api/v1/worm/keys/purge');
    const c = makeCtx({ user: { id: 'A1', name: 'admin', roles: ['admin'] }, body: { keyId: kZero, confirm: 'PURGE' } });
    const res = await h(c);
    expect(res.status).toBe(200);
  });

  test('retire 不需要 confirm（只给 keyId）→ 200', async () => {
    const provider = getKeyProvider();
    provider.rotate();
    const kR = provider.activeKeyId();
    provider.rotate();
    const h = findHandler('POST', '/api/v1/worm/keys/retire');
    const c = makeCtx({ user: { id: 'A1', name: 'admin', roles: ['admin'] }, body: { keyId: kR } });
    const res = await h(c);
    expect(res.status).toBe(200);
  });
});
