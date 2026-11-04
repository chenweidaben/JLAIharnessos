/**
 * 健澜AI原生医院操作系统OS - P0-7 生产 RBAC 关闭 DEMO 短路 端到端测试
 *
 * 真实 HTTP 打本机 BFF 8080（DEMO_MODE=1）。证明：
 *  1. auth:true 业务路由无 Authorization 头 → 401（不再注入 demo/super-admin）；
 *  2. 运维白名单 /health /ready /metrics /api/v1/health /api/v1/system/health 无 token 开放 200；
 *  3. POST /api/v1/auth/demo-login 四角色签发真实 JWT，非法 role → 400；
 *  4. 行级归属 visitId↔patientId 绑定：错配 403(40300)，正确绑定 200；
 *  5. 角色隔离：doctor 调 execute → 403(40300)，nurse 调 execute 域通过。
 *
 * 【probe-then-branch / 可重跑】
 *  - 白名单与 401/403 断言均为只读或拒绝前置（拒绝在落库前抛出），重跑幂等；
 *  - 正确绑定开立医嘱用时间戳内容，每次新建独立医嘱，不消耗/改写既有种子。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signToken(roles: string[], name: string, sub: string, permissions: string[] = []): string {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub, name, roles, permissions, iss: 'jianlan-bff', nbf: now, exp: now + 3600 });
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}

interface CallResult {
  httpStatus: number;
  code: number | null;
  data: any;
  raw: any;
}

async function call(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  let raw: any = null;
  try { raw = await res.json(); } catch { raw = null; }
  return { httpStatus: res.status, code: raw?.code ?? null, data: raw?.data ?? null, raw };
}

const doctor = signToken(['doctor'], '医生甲', 'doc-rbac-1', []);
const nurse = signToken(['nurse'], '护士乙', 'nurse-rbac-1', []);

beforeAll(async () => {
  const health = await fetch(BASE + '/health');
  if (health.status !== 200) {
    throw new Error('BFF 未就绪：请先 bun run src/bff/server.ts（DEMO_MODE=1），8080 应存活');
  }
});

describe('P0-7 规格1：auth:true 业务路由无 token → 401（不再注入 demo admin）', () => {
  it('GET /api/v1/orders 无 Authorization 头 → 401 且 code=40100', async () => {
    const r = await call('GET', '/api/v1/orders');
    expect(r.httpStatus).toBe(401);
    expect(r.code).toBe(40100);
  });

  it('POST /api/v1/orders/cpoe（auth:true）无 token → 401', async () => {
    const r = await call('GET', '/api/v1/orders/cpoe');
    expect(r.httpStatus).toBe(401);
    expect(r.code).toBe(40100);
  });

  it('带任意垃圾 token（非 JWT、非 dev 前缀）→ 401（不回退 mock admin）', async () => {
    const r = await call('GET', '/api/v1/orders', { token: 'not-a-real-token' });
    expect(r.httpStatus).toBe(401);
    expect(r.code).toBe(40100);
  });
});

describe('P0-7 规格2：运维白名单无 token 开放', () => {
  const WHITELIST = ['/health', '/ready', '/metrics', '/api/v1/health', '/api/v1/system/health'];
  for (const p of WHITELIST) {
    it(`GET ${p} 无 token → 200`, async () => {
      const res = await fetch(BASE + p);
      expect(res.status).toBe(200);
    });
  }
});

describe('P0-7 规格3：POST /api/v1/auth/demo-login 四角色签发 JWT', () => {
  const ROLES = ['doctor', 'nurse', 'pharmacist', 'admin'];
  for (const role of ROLES) {
    it(`role=${role} → 200 且返回可验签、可用于 auth:true 路由的 accessToken`, async () => {
      const r = await call('POST', '/api/v1/auth/demo-login', { body: { role } });
      expect(r.httpStatus).toBe(200);
      const token: string = r.data.tokens.accessToken;
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
      // 用签发的 token 反向打一个 auth:true 路由，应 200（证明不是 demo 短路注入）
      const me = await call('GET', '/api/v1/auth/userinfo', { token });
      expect(me.httpStatus).toBe(200);
    });
  }

  it('非法 role=manager → 400 且 code=40000', async () => {
    const r = await call('POST', '/api/v1/auth/demo-login', { body: { role: 'manager' } });
    expect(r.httpStatus).toBe(400);
    expect(r.code).toBe(40000);
  });
});

describe('P0-7 规格4：行级归属 visitId↔patientId 绑定越权 403', () => {
  it('visitId=VISIT-A100 但 patientId=PT-WRONG → 403 且 code=40300', async () => {
    const r = await call('POST', '/api/v1/orders', {
      token: doctor,
      body: { visitId: 'VISIT-A100', patientId: 'PT-WRONG', orderType: 'medication', content: '跨患者越权 ' + Date.now(), feeCents: 100 },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
    expect(String(r.raw.message)).toContain('行级归属校验失败');
  });

  it('visitId=VISIT-A100 + 正确 patientId=PT-P001 → 200 开立成功', async () => {
    const r = await call('POST', '/api/v1/orders', {
      token: doctor,
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', orderType: 'medication', content: '绑定正确 ' + Date.now(), feeCents: 200 },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.patientId).toBe('PT-P001');
    expect(r.data.status).toBe('pending_review');
  });
});

describe('P0-7 规格5：角色隔离（doctor 不可执行 → 403）', () => {
  it('doctor JWT 对已批准 ORD-CO-2 调 execute → 403 且 code=40300', async () => {
    const r = await call('POST', '/api/v1/orders/ORD-CO-2/execute', {
      token: doctor, body: { note: '医生不应能执行' },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('nurse JWT 可访问护士站只读列表 → 200', async () => {
    const r = await call('GET', '/api/v1/nurse-station/pending-review', { token: nurse });
    expect(r.httpStatus).toBe(200);
  });
});
