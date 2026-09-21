/**
 * 健澜科技数智医院智能体 - BFF 影像 AI（DAMO-RADAR）路由单测
 *
 * 覆盖：catalog（18 器官/146 发现）、jobs 提交、jobs 状态、review 写审计、
 *       RBAC 拒绝（401/403）、推理服务不可用时降级 mock、错误体结构、
 *       critical 告警通道复用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterEach, describe, expect, it } from 'bun:test';

import { catalogStats } from '../../integration/adapters/radar';
import { emitCriticalRadarAlert, setCriticalAlertSink } from '../alertBus';
import { newCtx } from '../middleware/auth';
import type { Ctx } from '../types';
import { imagingRoutes } from './imaging';

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

interface FakeUser {
  id: string;
  name: string;
  roles: string[];
  permissions?: string[];
}

function makeCtx(
  method: string,
  path: string,
  opts: { user?: FakeUser | null; body?: unknown; query?: Record<string, string> } = {},
): Ctx {
  const url = `http://localhost:8080${path}`;
  const init: RequestInit = { method, headers: { 'content-type': 'application/json' } };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
  }
  const req = new Request(url, init);
  const query = new URLSearchParams(opts.query ?? {});
  const ctx = newCtx(req, {}, query);
  ctx.user = opts.user === undefined ? null : opts.user;
  return ctx;
}

const ADMIN: FakeUser = { id: 'u_1', name: '陈维', roles: ['admin'] };
const GUEST: FakeUser = { id: 'u_2', name: '访客', roles: ['guest'] };

function routeOf(method: string, pattern: string) {
  const r = imagingRoutes.find((x) => x.method === method && x.path === pattern);
  if (!r) throw new Error(`路由未注册: ${method} ${pattern}`);
  return r;
}

/** 直接调用路由 handler（与 server.ts 一致；params 由 opts.params 注入） */
async function call(
  method: string,
  pattern: string,
  opts: Parameters<typeof makeCtx>[2] & { params?: Record<string, string> } = {},
) {
  const ctx = makeCtx(method, pattern, opts);
  ctx.params = opts.params ?? {};
  const res = await routeOf(method, pattern).handle(ctx);
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

/* ------------------------------------------------------------------ */
/* 用例                                                                */
/* ------------------------------------------------------------------ */

describe('RADAR 数据契约', () => {
  it('内置目录为 18 器官 / 146 发现', () => {
    const stats = catalogStats();
    expect(stats.organCount).toBe(18);
    expect(stats.findingCount).toBe(146);
  });
});

describe('GET /api/v1/imaging/ai/catalog', () => {
  it('未登录返回 401 结构化错误体', async () => {
    const { status, json } = await call('GET', '/api/v1/imaging/ai/catalog', { user: null });
    expect(status).toBe(401);
    expect(json).toHaveProperty('code');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('traceId');
  });

  it('无权限角色返回 403', async () => {
    const { status, json } = await call('GET', '/api/v1/imaging/ai/catalog', { user: GUEST });
    expect(status).toBe(403);
    expect(json.code).not.toBe(0);
  });

  it('管理员返回 catalog，含 degraded 标记（无上游时降级演示数据）', async () => {
    const { status, json } = await call('GET', '/api/v1/imaging/ai/catalog', { user: ADMIN });
    expect(status).toBe(200);
    expect(json.code).toBe(0);
    const data = json.data as {
      organs: { findings: unknown[] }[];
      positive_threshold: number;
      critical_findings: string[];
      degraded: boolean;
    };
    expect(data.organs.length).toBe(18);
    expect(data.organs.reduce((n, o) => n + o.findings.length, 0)).toBe(146);
    expect(typeof data.positive_threshold).toBe('number');
    expect(Array.isArray(data.critical_findings)).toBe(true);
    // 测试环境无 8090 上游，必为降级
    expect(data.degraded).toBe(true);
  });
});

describe('POST /api/v1/imaging/ai/jobs', () => {
  it('无权限被拒；管理员提交返回 job（降级 mock）', async () => {
    const denied = await call('POST', '/api/v1/imaging/ai/jobs', {
      user: GUEST,
      body: { study_uid: 'STUDY_T1', source: 'demo' },
    });
    expect(denied.status).toBe(403);

    const okRes = await call('POST', '/api/v1/imaging/ai/jobs', {
      user: ADMIN,
      body: { study_uid: 'STUDY_T1', patient_id: 'P100001', source: 'demo' },
    });
    expect(okRes.status).toBe(200);
    expect(okRes.json.code).toBe(0);
    const data = okRes.json.data as { job_id: string; status: string; mode: string; degraded: boolean };
    expect(typeof data.job_id).toBe('string');
    expect(data.status).toBe('completed');
    expect(data.mode).toBe('demo');
    expect(data.degraded).toBe(true);
  });
});

describe('GET /api/v1/imaging/ai/jobs/:id', () => {
  it('任务不存在返回 404 结构化错误体；存在则返回 146 findings', async () => {
    const missing = await call('GET', '/api/v1/imaging/ai/jobs/:id', {
      user: ADMIN,
      params: { id: 'no_such_job' },
    });
    expect(missing.status).toBe(404);
    expect(missing.json).toHaveProperty('traceId');

    // 先提交一个任务
    const created = await call('POST', '/api/v1/imaging/ai/jobs', {
      user: ADMIN,
      body: { study_uid: 'STUDY_T2', patient_id: 'P100002', source: 'demo' },
    });
    const jobId = (created.json.data as { job_id: string }).job_id;

    const got = await call('GET', '/api/v1/imaging/ai/jobs/:id', {
      user: ADMIN,
      params: { id: jobId },
    });
    expect(got.status).toBe(200);
    const data = got.json.data as {
      status: string;
      result: { findings: unknown[]; summary: { positive_count: number } };
    };
    expect(data.status).toBe('completed');
    expect(data.result.findings.length).toBe(146);
    expect(typeof data.result.summary.positive_count).toBe('number');
  });
});

describe('GET /api/v1/imaging/ai/jobs?patient_id=', () => {
  it('按 patient_id 过滤历史列表', async () => {
    await call('POST', '/api/v1/imaging/ai/jobs', {
      user: ADMIN,
      body: { study_uid: 'STUDY_T3', patient_id: 'P_QUERY', source: 'demo' },
    });
    const { status, json } = await call('GET', '/api/v1/imaging/ai/jobs', {
      user: ADMIN,
      query: { patient_id: 'P_QUERY' },
    });
    expect(status).toBe(200);
    const data = json.data as { total: number; items: { patient_id: string }[] };
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.items.every((i) => i.patient_id === 'P_QUERY')).toBe(true);
  });
});

describe('POST /api/v1/imaging/ai/jobs/:id/review', () => {
  it('审核权限被拒；合法复核返回 audit_id 并禁止重复签名', async () => {
    const created = await call('POST', '/api/v1/imaging/ai/jobs', {
      user: ADMIN,
      body: { study_uid: 'STUDY_REV', patient_id: 'P_REV', source: 'demo' },
    });
    const jobId = (created.json.data as { job_id: string }).job_id;

    // 无 review 权限
    const denied = await call('POST', '/api/v1/imaging/ai/jobs/:id/review', {
      user: GUEST,
      params: { id: jobId },
      body: { verdict: 'approve', signer_id: 'r1', signer_name: '王医生' },
    });
    expect(denied.status).toBe(403);

    // 缺 signer
    const bad = await call('POST', '/api/v1/imaging/ai/jobs/:id/review', {
      user: ADMIN,
      params: { id: jobId },
      body: { verdict: 'approve' },
    });
    expect(bad.status).toBe(400);

    // 合法复核
    const okRev = await call('POST', '/api/v1/imaging/ai/jobs/:id/review', {
      user: ADMIN,
      params: { id: jobId },
      body: { verdict: 'approve', comment: '与影像一致', signer_id: 'r1', signer_name: '王医生' },
    });
    expect(okRev.status).toBe(200);
    expect(okRev.json.code).toBe(0);
    const data = okRev.json.data as { audit_id: string; verdict: string; signer_id: string };
    expect(typeof data.audit_id).toBe('string');
    expect(data.verdict).toBe('approve');
    expect(data.signer_id).toBe('r1');

    // 重复签名 → 409
    const again = await call('POST', '/api/v1/imaging/ai/jobs/:id/review', {
      user: ADMIN,
      params: { id: jobId },
      body: { verdict: 'reject', signer_id: 'r2', signer_name: '李医生' },
    });
    expect(again.status).toBe(409);
  });
});

describe('critical 告警通道复用', () => {
  afterEach(() => setCriticalAlertSink(null));

  it('emitCriticalRadarAlert 走已注入的 critical:alert sink', async () => {
    const frames: { event: string; payload: unknown }[] = [];
    setCriticalAlertSink((event, payload) => frames.push({ event, payload }));
    emitCriticalRadarAlert({ title: '影像危急值', findings: ['肝_肝细胞癌'] });
    expect(frames.length).toBe(1);
    expect(frames[0].event).toBe('critical:alert');
  });
});
