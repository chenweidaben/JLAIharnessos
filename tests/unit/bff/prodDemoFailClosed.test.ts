/**
 * 生产环境 DEMO_MODE fail-closed 与会话校验 fail-closed 单元测试。
 *
 * 覆盖口径：
 *  1. assertProductionNotDemoMode：生产 + DEMO_MODE=1 启动即抛错；非生产演示放行；
 *  2. requireAuth：生产环境即使误配 DEMO_MODE=1 也不授予 demo admin，无登录态返回 401；
 *     非生产演示模式保持既有短路放行行为；
 *  3. enforceSession：生产环境不得跳过 jti 会话校验；DB 故障按未登录拒绝（fail-closed）；
 *     非生产演示模式跳过查库；
 *  4. shouldSkipAuditForDemo：生产环境不得跳过操作审计落库；非生产演示模式跳过；
 *  5. checkSessionActive：DB 异常返回 false（fail-closed），有效会话 true，已吊销/过期 false。
 *
 * 环境变量在每个用例前后显式复位，避免污染同进程其他用例。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

/* 会话仓储在模块加载前替换为内存桩，按 repoBehavior 切换有效/吊销/故障三种状态 */
let repoBehavior: 'active' | 'revoked' | 'error' = 'active';
mock.module('@/db/repositories/sessionRepo', () => ({
  getActiveByJti: async () => {
    if (repoBehavior === 'error') throw new Error('db connection refused');
    return repoBehavior === 'active' ? { jti: 'jti-1' } : null;
  },
}));

import { requireAuth } from '@/bff/middleware/auth';
import { enforceSession, checkSessionActive, clearSessionCache } from '@/bff/middleware/sessionGuard';
import { shouldSkipAuditForDemo } from '@/bff/middleware/audit';
import {
  assertProductionNotDemoMode,
  isDemoModeEnabled,
  isProductionEnv,
} from '@/bff/config/runtimeEnv';
import type { Ctx } from '@/bff/types';

/** 构造最小可用 Ctx，仅满足中间件读取字段。 */
function makeCtx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    req: new Request('http://localhost:8080/api/v1/x', { method: 'POST' }),
    params: {},
    query: new URLSearchParams(),
    rawBody: null,
    body: async () => ({}),
    clientIp: null,
    user: null,
    traceId: 'trc_prod_demo_test',
    ...overrides,
  } as unknown as Ctx;
}

const savedNodeEnv = process.env.NODE_ENV;
const savedDemoMode = process.env.DEMO_MODE;

beforeEach(() => {
  repoBehavior = 'active';
  clearSessionCache('jti-1');
});

afterEach(() => {
  process.env.NODE_ENV = savedNodeEnv;
  if (savedDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = savedDemoMode;
});

describe('assertProductionNotDemoMode 启动期演示模式拒绝', () => {
  it('生产环境 + DEMO_MODE=1 启动即抛错', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = '1';
    expect(isProductionEnv()).toBe(true);
    expect(isDemoModeEnabled()).toBe(true);
    expect(() => assertProductionNotDemoMode()).toThrow(/生产环境禁止开启 DEMO_MODE/);
  });

  it('生产环境 + DEMO_MODE=true 同样拒绝', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';
    expect(() => assertProductionNotDemoMode()).toThrow(/生产环境禁止开启 DEMO_MODE/);
  });

  it('生产环境未开启演示模式：不抛错', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    expect(() => assertProductionNotDemoMode()).not.toThrow();
  });

  it('非生产环境 + DEMO_MODE=1：演示放行，不抛错', () => {
    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = '1';
    expect(() => assertProductionNotDemoMode()).not.toThrow();
  });
});

describe('requireAuth 演示短路仅限非生产环境', () => {
  it('生产环境误配 DEMO_MODE=1：无登录态返回 401，不授予 demo admin', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = '1';
    const ctx = makeCtx({ user: null });
    const denied = requireAuth(ctx);
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
    expect(ctx.user).toBeNull();
  });

  it('生产环境误配 DEMO_MODE=1：已登录用户保持原身份，不被替换为 demo admin', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = '1';
    const original = { id: 'u-1', name: '王医生', roles: ['doctor'], permissions: ['emr:read'] };
    const ctx = makeCtx({ user: original });
    const denied = requireAuth(ctx);
    expect(denied).toBeNull();
    expect(ctx.user).toBe(original);
  });

  it('非生产环境 + DEMO_MODE=1：无登录态短路授予 demo admin（既有演示行为保留）', () => {
    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = '1';
    const ctx = makeCtx({ user: null });
    const denied = requireAuth(ctx);
    expect(denied).toBeNull();
    expect(ctx.user).not.toBeNull();
    expect(ctx.user!.roles).toEqual(['admin']);
    expect(ctx.user!.permissions).toEqual(['*']);
  });

  it('生产环境未开启演示模式：无登录态返回 401', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    const ctx = makeCtx({ user: null });
    const denied = requireAuth(ctx);
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
  });
});

describe('enforceSession 生产不跳过 jti 校验，DB 故障 fail-closed', () => {
  it('生产环境误配 DEMO_MODE=1：不跳过查库；DB 故障清空会话（fail-closed）', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = '1';
    repoBehavior = 'error';
    const ctx = makeCtx({ user: { id: 'u-1', name: '王医生', roles: ['doctor'], jti: 'jti-1' } });
    await enforceSession(ctx);
    expect(ctx.user).toBeNull();
  });

  it('生产环境：有效会话保留', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    repoBehavior = 'active';
    const user = { id: 'u-1', name: '王医生', roles: ['doctor'], jti: 'jti-1' };
    const ctx = makeCtx({ user });
    await enforceSession(ctx);
    expect(ctx.user).toBe(user);
  });

  it('生产环境：已吊销/过期会话清空 ctx.user', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    repoBehavior = 'revoked';
    const ctx = makeCtx({ user: { id: 'u-1', name: '王医生', roles: ['doctor'], jti: 'jti-1' } });
    await enforceSession(ctx);
    expect(ctx.user).toBeNull();
  });

  it('非生产演示模式：跳过 jti 查库，会话保留（既有演示行为保留）', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = '1';
    repoBehavior = 'error';
    const user = { id: 'u-demo', name: '演示用户', roles: ['admin'], jti: 'jti-1' };
    const ctx = makeCtx({ user });
    await enforceSession(ctx);
    expect(ctx.user).toBe(user);
  });
});

describe('checkSessionActive DB 故障 fail-closed', () => {
  it('DB 异常返回 false（不返回 true 放行）', async () => {
    repoBehavior = 'error';
    clearSessionCache('jti-1');
    await expect(checkSessionActive('jti-1')).resolves.toBe(false);
  });

  it('有效会话返回 true', async () => {
    repoBehavior = 'active';
    clearSessionCache('jti-1');
    await expect(checkSessionActive('jti-1')).resolves.toBe(true);
  });

  it('已吊销/过期会话返回 false', async () => {
    repoBehavior = 'revoked';
    clearSessionCache('jti-1');
    await expect(checkSessionActive('jti-1')).resolves.toBe(false);
  });
});

describe('shouldSkipAuditForDemo 生产不得跳过审计落库', () => {
  it('生产环境误配 DEMO_MODE=1：不跳过审计', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = '1';
    expect(shouldSkipAuditForDemo()).toBe(false);
  });

  it('非生产演示模式：跳过审计（既有演示行为保留）', () => {
    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = '1';
    expect(shouldSkipAuditForDemo()).toBe(true);
  });

  it('生产环境未开启演示模式：不跳过审计', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    expect(shouldSkipAuditForDemo()).toBe(false);
  });
});
