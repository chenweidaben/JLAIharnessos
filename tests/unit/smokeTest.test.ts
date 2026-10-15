/**
 * 健澜科技 jlmedaios - 路由回归冒烟测试纯函数单元测试
 *
 * 覆盖：
 *  - classifyStatus：状态码四分类（pass / auth / forbidden / fail）
 *  - classifyAuthRequirement：鉴权需求三分类（public / auth / admin，依据宪法第三章）
 *  - summarize：失败收集、汇总计算与 byAuth 分桶
 *  - buildSmokeResults：静态清单结构一致性比对 + 鉴权档标注
 *  - KNOWN_GET_ROUTES：MUSE 系列新路由登记完整性
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  classifyAuthRequirement,
  classifyStatus,
  KNOWN_GET_ROUTES,
  summarize,
  type AuthRequirement,
  type SmokeRouteResult,
} from '../../src/bff/aggregators/smokeTestAggregator.js';
import { buildSmokeResults } from '../../src/bff/routes/smokeTest.js';

describe('classifyStatus 状态分类', () => {
  it('200 及 2xx 一律判为 pass', () => {
    expect(classifyStatus(200)).toBe('pass');
    expect(classifyStatus(201)).toBe('pass');
    expect(classifyStatus(204)).toBe('pass');
  });

  it('401 判为 auth（未登录，非故障）', () => {
    expect(classifyStatus(401)).toBe('auth');
  });

  it('403 判为 forbidden（权限不足，非故障）', () => {
    expect(classifyStatus(403)).toBe('forbidden');
  });

  it('500 及 5xx 一律判为 fail', () => {
    expect(classifyStatus(500)).toBe('fail');
    expect(classifyStatus(502)).toBe('fail');
    expect(classifyStatus(503)).toBe('fail');
    expect(classifyStatus(599)).toBe('fail');
  });

  it('其余状态码（400/404/429 等）按 fail 保守处理', () => {
    expect(classifyStatus(400)).toBe('fail');
    expect(classifyStatus(404)).toBe('fail');
    expect(classifyStatus(429)).toBe('fail');
  });
});

describe('classifyAuthRequirement 鉴权档分类（依据宪法第三章）', () => {
  it('公开白名单（health / model-info）判为 public', () => {
    expect(classifyAuthRequirement('/api/v1/health')).toBe('public');
    expect(classifyAuthRequirement('/api/v1/model-info')).toBe('public');
  });

  it('/api/v1/admin/* 前缀一律判为 admin', () => {
    expect(classifyAuthRequirement('/api/v1/admin/users')).toBe('admin');
    expect(classifyAuthRequirement('/api/v1/admin/users/:id')).toBe('admin');
    expect(classifyAuthRequirement('/api/v1/admin/audit-logs')).toBe('admin');
    expect(classifyAuthRequirement('/api/v1/admin/login-logs/trend')).toBe('admin');
  });

  it('MUSE 管理 / 全院视角（非 admin 前缀）精确判为 admin', () => {
    expect(classifyAuthRequirement('/api/v1/muse/admin')).toBe('admin');
    expect(classifyAuthRequirement('/api/v1/muse/hospital')).toBe('admin');
  });

  it('MUSE 员工 / 护士 / 药师 / 入职 / 搜索默认判为 auth', () => {
    expect(classifyAuthRequirement('/api/v1/muse/home')).toBe('auth');
    expect(classifyAuthRequirement('/api/v1/muse/nurse')).toBe('auth');
    expect(classifyAuthRequirement('/api/v1/muse/pharma')).toBe('auth');
    expect(classifyAuthRequirement('/api/v1/muse/onboarding')).toBe('auth');
    expect(classifyAuthRequirement('/api/v1/muse/search')).toBe('auth');
  });

  it('临床业务 / 智能体平台等默认判为 auth', () => {
    expect(classifyAuthRequirement('/api/v1/admission-notes')).toBe('auth');
    expect(classifyAuthRequirement('/api/v1/agent-builder/agents')).toBe('auth');
    expect(classifyAuthRequirement('/api/v1/medmuse/agent-health')).toBe('auth');
  });

  it('返回值仅为三档枚举之一', () => {
    const out = classifyAuthRequirement('/api/v1/anything');
    expect(['public', 'auth', 'admin'] as AuthRequirement[]).toContain(out);
  });
});

describe('KNOWN_GET_ROUTES 路由清单完整性', () => {
  const museGetRoutes = [
    '/api/v1/muse/home',
    '/api/v1/muse/nurse',
    '/api/v1/muse/pharma',
    '/api/v1/muse/onboarding',
    '/api/v1/muse/search',
    '/api/v1/muse/admin',
    '/api/v1/muse/hospital',
  ];

  it('所有 MUSE GET 路由均已登记', () => {
    for (const r of museGetRoutes) {
      expect(KNOWN_GET_ROUTES).toContain(r);
    }
  });

  it('清单内每条路径均以 /api/v1/ 前缀开头', () => {
    for (const r of KNOWN_GET_ROUTES) {
      expect(r.startsWith('/api/v1/')).toBe(true);
    }
  });

  it('清单内路径无重复登记', () => {
    const seen = new Set<string>();
    for (const r of KNOWN_GET_ROUTES) {
      expect(seen.has(r)).toBe(false);
      seen.add(r);
    }
  });

  it('每条路径均可被 classifyAuthRequirement 识别为合法三档', () => {
    for (const r of KNOWN_GET_ROUTES) {
      const a = classifyAuthRequirement(r);
      expect(['public', 'auth', 'admin'] as AuthRequirement[]).toContain(a);
    }
  });
});

describe('summarize 汇总计算、失败收集与 byAuth 分桶', () => {
  it('空入参返回全零汇总（含 byAuth 三档归零）', () => {
    const s = summarize([]);
    expect(s).toEqual({
      total: 0,
      pass: 0,
      fail: 0,
      failures: [],
      byAuth: { public: 0, auth: 0, admin: 0 },
    });
  });

  it('全部 pass 时 fail 为 0、failures 为空', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/a', status: 200, auth: 'auth' },
      { method: 'GET', path: '/api/v1/b', status: 200, auth: 'auth' },
    ];
    const s = summarize(results);
    expect(s.total).toBe(2);
    expect(s.pass).toBe(2);
    expect(s.fail).toBe(0);
    expect(s.failures).toEqual([]);
    expect(s.byAuth).toEqual({ public: 0, auth: 2, admin: 0 });
  });

  it('收集所有 fail 结果并保持入参顺序', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/a', status: 200, auth: 'auth' },
      { method: 'GET', path: '/missing-1', status: 500, note: '缺前缀', auth: 'auth' },
      { method: 'GET', path: '/api/v1/b', status: 200, auth: 'auth' },
      { method: 'GET', path: '/dup', status: 500, note: '重复登记', auth: 'admin' },
    ];
    const s = summarize(results);
    expect(s.total).toBe(4);
    expect(s.pass).toBe(2);
    expect(s.fail).toBe(2);
    expect(s.failures.map((f) => f.path)).toEqual(['/missing-1', '/dup']);
  });

  it('auth / forbidden 既不计入 pass 也不计入 fail', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/open', status: 200, auth: 'public' },
      { method: 'GET', path: '/api/v1/authz', status: 401, auth: 'auth' },
      { method: 'GET', path: '/api/v1/admin-zone', status: 403, auth: 'admin' },
      { method: 'GET', path: '/api/v1/broken', status: 500, auth: 'auth' },
    ];
    const s = summarize(results);
    expect(s.total).toBe(4);
    expect(s.pass).toBe(1); // 仅 200
    expect(s.fail).toBe(1); // 仅 500
    expect(s.failures).toHaveLength(1);
    expect(s.failures[0].path).toBe('/api/v1/broken');
    // pass + fail < total（两条鉴权结果被排除）
    expect(s.pass + s.fail).toBeLessThan(s.total);
  });

  it('failures 明细包含原始 note、status 与 auth 标注', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/x', status: 500, note: '路由重复登记', auth: 'admin' },
    ];
    const s = summarize(results);
    expect(s.failures[0]).toEqual({
      method: 'GET',
      path: '/api/v1/x',
      status: 500,
      note: '路由重复登记',
      auth: 'admin',
    });
  });

  it('byAuth 分桶按 auth 字段累计，与 status 无关', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/health', status: 200, auth: 'public' },
      { method: 'GET', path: '/api/v1/admin/a', status: 200, auth: 'admin' },
      { method: 'GET', path: '/api/v1/admin/b', status: 500, note: 'broken', auth: 'admin' },
      { method: 'GET', path: '/api/v1/muse/home', status: 200, auth: 'auth' },
      { method: 'GET', path: '/api/v1/muse/hospital', status: 403, auth: 'admin' },
    ];
    const s = summarize(results);
    expect(s.byAuth).toEqual({ public: 1, auth: 1, admin: 3 });
  });
});

describe('buildSmokeResults 静态清单结构比对与鉴权档标注', () => {
  it('合法 /api/v1 路径产出 200 pass 并附带 auth 标注', () => {
    const out = buildSmokeResults(['/api/v1/health', '/api/v1/admin/users/:id']);
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.status === 200 && r.method === 'GET')).toBe(true);
    expect(out[0].auth).toBe('public');
    expect(out[1].auth).toBe('admin');
  });

  it('缺少 /api/v1/ 前缀产出 500 fail 并写明原因', () => {
    const out = buildSmokeResults(['/health']);
    expect(out[0].status).toBe(500);
    expect(out[0].note).toContain('/api/v1/');
    expect(out[0].auth).toBe('auth'); // 未命中白名单，默认 auth
  });

  it('重复登记的路径第二条判 500 fail', () => {
    const out = buildSmokeResults(['/api/v1/a', '/api/v1/a']);
    expect(out[0].status).toBe(200);
    expect(out[1].status).toBe(500);
    expect(out[1].note).toContain('重复');
  });

  it('与 summarize 串联：合法清单全通过', () => {
    const summary = summarize(buildSmokeResults(['/api/v1/ok']));
    expect(summary.pass).toBe(1);
    expect(summary.fail).toBe(0);
  });

  it('与 summarize 串联：含前缀错误时失败清单被收集', () => {
    const summary = summarize(
      buildSmokeResults(['/api/v1/ok', '/bad', '/api/v1/ok']),
    );
    expect(summary.total).toBe(3);
    expect(summary.pass).toBe(1);
    expect(summary.fail).toBe(2);
    expect(summary.failures.map((f) => f.path)).toEqual(['/bad', '/api/v1/ok']);
  });

  it('对内置 KNOWN_GET_ROUTES 全量遍历：零失败、byAuth 三桶均有计数', () => {
    const results = buildSmokeResults(KNOWN_GET_ROUTES);
    const summary = summarize(results);
    expect(summary.fail).toBe(0);
    expect(summary.failures).toEqual([]);
    expect(summary.total).toBe(KNOWN_GET_ROUTES.length);
    // 三档均应有路由：public（health/model-info）、admin（admin/* + muse/admin + muse/hospital）、auth（其余）
    expect(summary.byAuth.public).toBeGreaterThanOrEqual(1);
    expect(summary.byAuth.admin).toBeGreaterThanOrEqual(1);
    expect(summary.byAuth.auth).toBeGreaterThanOrEqual(1);
    // byAuth 合计 == total
    expect(summary.byAuth.public + summary.byAuth.auth + summary.byAuth.admin).toBe(
      summary.total,
    );
  });
});
