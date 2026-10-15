/**
 * 健澜科技 jlmedaios - 路由冒烟测试纯函数单元测试【生产就绪质量门禁】
 *
 * M135-A 覆盖：
 *  - 路由发现：resolveUrl 地址拼接与 :param 具体化、smokeTestAllRoutes
 *    对桶标注 / 重复登记 / 非法路径 / 注入探针的逐条编排；
 *  - 结果聚合：DEFAULT_ROUTE_INVENTORY 六桶完整、前缀合法、零重复；
 *  - 报告生成：generateSmokeReport 的通过率 / 分桶统计 / 平均与最大耗时 /
 *    失败明细 / 门禁结论 ok。
 *
 * 兼容旧版：classifyStatus / classifyAuthRequirement / KNOWN_GET_ROUTES /
 * summarize / buildSmokeResults 的既有断言一并保留。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  classifyAuthRequirement,
  classifyStatus,
  DEFAULT_ROUTE_INVENTORY,
  FULL_ROUTE_INVENTORY,
  generateSmokeReport,
  KNOWN_GET_ROUTES,
  resolveUrl,
  smokeAllRoutes,
  smokeTestAllRoutes,
  structuralProbe,
  summarize,
  type RouteBucket,
  type RouteProbe,
  type SmokeReport,
  type SmokeResult,
  type SmokeRouteDef,
} from '../../src/bff/aggregators/smokeTestAggregator.js';
import { buildSmokeResults } from '../../src/bff/routes/smokeTest.js';

/* ===================== M135-A 路由发现 ===================== */

describe('resolveUrl 地址拼接与路径参数具体化', () => {
  it('baseUrl 去尾斜杠后直连路径', () => {
    expect(resolveUrl('http://127.0.0.1:8080/', '/api/v1/health')).toBe(
      'http://127.0.0.1:8080/api/v1/health',
    );
  });

  it('baseUrl 无尾斜杠时不重复拼接', () => {
    expect(resolveUrl('http://127.0.0.1:8080', '/api/v1/health')).toBe(
      'http://127.0.0.1:8080/api/v1/health',
    );
  });

  it(':id / :visitId 等路径参数统一替换为采样值 1', () => {
    expect(resolveUrl('http://h', '/api/v1/admin/users/:id')).toBe(
      'http://h/api/v1/admin/users/1',
    );
    expect(resolveUrl('http://h', '/api/v1/outpatient/encounters/:id/orders/:oid')).toBe(
      'http://h/api/v1/outpatient/encounters/1/orders/1',
    );
  });
});

describe('smokeTestAllRoutes 路由发现与逐条编排', () => {
  const routes: SmokeRouteDef[] = [
    { method: 'get', path: '/api/v1/health', bucket: 'public', label: '健康检查' },
    { method: 'GET', path: '/api/v1/admin/users/:id', bucket: 'admin', label: '用户' },
    { method: 'GET', path: '/bad/path', bucket: 'doctor' },
    { method: 'GET', path: '/api/v1/admin/users/:id', bucket: 'admin' }, // 重复
  ];

  it('method 归一为大写并携带桶标注与中文标签', () => {
    const out = smokeTestAllRoutes(routes, 'http://h');
    expect(out[0].method).toBe('GET');
    expect(out[0].bucket).toBe('public');
    expect(out[0].label).toBe('健康检查');
  });

  it('url 由 baseUrl 与具体化路径解析得出', () => {
    const out = smokeTestAllRoutes(routes, 'http://h/');
    expect(out[1].url).toBe('http://h/api/v1/admin/users/1');
  });

  it('默认 structuralProbe：合法前缀 200 绿、缺前缀 500 红', () => {
    const out = smokeTestAllRoutes(routes, 'http://h');
    expect(out[0].status).toBe(200);
    expect(out[0].ok).toBe(true);
    expect(out[2].status).toBe(500);
    expect(out[2].ok).toBe(false);
    expect(out[2].note).toContain('/api/v1/');
  });

  it('重复登记的第二条判 500 红并写明原因', () => {
    const out = smokeTestAllRoutes(routes, 'http://h');
    expect(out[3].status).toBe(500);
    expect(out[3].note).toContain('重复');
  });

  it('路径不以 / 开头判 500 红', () => {
    const out = smokeTestAllRoutes(
      [{ method: 'GET', path: 'api/v1/x', bucket: 'admin' }],
      'http://h',
    );
    expect(out[0].ok).toBe(false);
    expect(out[0].note).toContain('/');
  });

  it('注入探针：记录真实响应时间 elapsedMs，2xx 绿其余红', () => {
    const fakeProbe: RouteProbe = (_def, url) =>
      url.endsWith('/slow')
        ? { status: 200, elapsedMs: 128 }
        : { status: 503, elapsedMs: 42, note: '上游不可达' };
    const out = smokeTestAllRoutes(
      [
        { method: 'GET', path: '/api/v1/slow', bucket: 'doctor' },
        { method: 'GET', path: '/api/v1/down', bucket: 'pharma' },
      ],
      'http://h',
      fakeProbe,
    );
    expect(out[0]).toMatchObject({ ok: true, status: 200, elapsedMs: 128 });
    expect(out[1]).toMatchObject({ ok: false, status: 503, elapsedMs: 42, note: '上游不可达' });
  });

  it('空清单返回空结果数组', () => {
    expect(smokeTestAllRoutes([], 'http://h')).toEqual([]);
  });
});

describe('DEFAULT_ROUTE_INVENTORY 结果聚合基准', () => {
  it('六桶（public/admin/doctor/nurse/pharma/patient）均有路由', () => {
    const buckets = new Set<RouteBucket>(DEFAULT_ROUTE_INVENTORY.map((r) => r.bucket));
    expect(buckets.has('public')).toBe(true);
    expect(buckets.has('admin')).toBe(true);
    expect(buckets.has('doctor')).toBe(true);
    expect(buckets.has('nurse')).toBe(true);
    expect(buckets.has('pharma')).toBe(true);
    expect(buckets.has('patient')).toBe(true);
  });

  it('全部路径以 /api/v1/ 开头且无重复', () => {
    const seen = new Set<string>();
    for (const r of DEFAULT_ROUTE_INVENTORY) {
      expect(r.path.startsWith('/api/v1/')).toBe(true);
      expect(seen.has(r.path)).toBe(false);
      seen.add(r.path);
    }
  });

  it('默认探针全量冒烟零失败（结构合法）', () => {
    const results = smokeTestAllRoutes(DEFAULT_ROUTE_INVENTORY, 'http://h');
    expect(results.length).toBe(DEFAULT_ROUTE_INVENTORY.length);
    expect(results.every((r) => r.ok)).toBe(true);
  });
});

/* ===================== M135-A 报告生成 ===================== */

describe('generateSmokeReport 报告生成', () => {
  it('空清单：passRate=1、ok=true、各桶归零', () => {
    const report = generateSmokeReport([], { baseUrl: 'http://h', generatedAt: '2026-01-01T00:00:00Z' });
    expect(report).toMatchObject({
      total: 0,
      pass: 0,
      fail: 0,
      passRate: 1,
      ok: true,
      avgElapsedMs: 0,
      maxElapsedMs: 0,
      baseUrl: 'http://h',
      generatedAt: '2026-01-01T00:00:00Z',
    });
    expect(report.byBucket.admin).toEqual({ total: 0, pass: 0, fail: 0 });
  });

  it('通过 / 失败计数与通过率精确计算', () => {
    const results: SmokeResult[] = [
      { method: 'GET', path: '/a', url: 'http://h/a', bucket: 'public', status: 200, ok: true, elapsedMs: 10 },
      { method: 'GET', path: '/b', url: 'http://h/b', bucket: 'admin', status: 200, ok: true, elapsedMs: 20 },
      { method: 'GET', path: '/c', url: 'http://h/c', bucket: 'doctor', status: 500, ok: false, elapsedMs: 30, note: '坏' },
    ];
    const report: SmokeReport = generateSmokeReport(results);
    expect(report.total).toBe(3);
    expect(report.pass).toBe(2);
    expect(report.fail).toBe(1);
    expect(report.passRate).toBe(0.6667);
    expect(report.ok).toBe(false);
  });

  it('byBucket 分桶独立累计 total/pass/fail', () => {
    const results: SmokeResult[] = [
      { method: 'GET', path: '/a', url: '', bucket: 'public', status: 200, ok: true, elapsedMs: 1 },
      { method: 'GET', path: '/b', url: '', bucket: 'admin', status: 200, ok: true, elapsedMs: 1 },
      { method: 'GET', path: '/c', url: '', bucket: 'admin', status: 500, ok: false, elapsedMs: 1 },
      { method: 'GET', path: '/d', url: '', bucket: 'nurse', status: 503, ok: false, elapsedMs: 1 },
    ];
    const report = generateSmokeReport(results);
    expect(report.byBucket.public).toEqual({ total: 1, pass: 1, fail: 0 });
    expect(report.byBucket.admin).toEqual({ total: 2, pass: 1, fail: 1 });
    expect(report.byBucket.nurse).toEqual({ total: 1, pass: 0, fail: 1 });
    expect(report.byBucket.pharma).toEqual({ total: 0, pass: 0, fail: 0 });
  });

  it('平均 / 最大响应时间正确聚合', () => {
    const results: SmokeResult[] = [
      { method: 'GET', path: '/a', url: '', bucket: 'doctor', status: 200, ok: true, elapsedMs: 10 },
      { method: 'GET', path: '/b', url: '', bucket: 'doctor', status: 200, ok: true, elapsedMs: 30 },
    ];
    const report = generateSmokeReport(results);
    expect(report.avgElapsedMs).toBe(20);
    expect(report.maxElapsedMs).toBe(30);
  });

  it('failures 保持红项原顺序，results 原样回带', () => {
    const results: SmokeResult[] = [
      { method: 'GET', path: '/a', url: '', bucket: 'admin', status: 200, ok: true, elapsedMs: 1 },
      { method: 'GET', path: '/b', url: '', bucket: 'admin', status: 500, ok: false, elapsedMs: 1, note: '一' },
      { method: 'GET', path: '/c', url: '', bucket: 'admin', status: 200, ok: true, elapsedMs: 1 },
      { method: 'GET', path: '/d', url: '', bucket: 'admin', status: 502, ok: false, elapsedMs: 1, note: '二' },
    ];
    const report = generateSmokeReport(results);
    expect(report.failures.map((f) => f.path)).toEqual(['/b', '/d']);
    expect(report.results).toHaveLength(4);
  });

  it('与 smokeTestAllRoutes 串联：基准清单全绿 → ok=true', () => {
    const results = smokeTestAllRoutes(DEFAULT_ROUTE_INVENTORY, 'http://h');
    const report = generateSmokeReport(results, { baseUrl: 'http://h' });
    expect(report.ok).toBe(true);
    expect(report.fail).toBe(0);
    expect(report.failures).toEqual([]);
  });

  it('与 smokeTestAllRoutes 串联：注入故障探针后报告红项可见', () => {
    const broken: RouteProbe = () => ({ status: 500, elapsedMs: 0, note: '爆炸' });
    const results = smokeTestAllRoutes(
      [{ method: 'GET', path: '/api/v1/x', bucket: 'pharma' }],
      'http://h',
      broken,
    );
    const report = generateSmokeReport(results);
    expect(report.ok).toBe(false);
    expect(report.fail).toBe(1);
    expect(report.failures[0].note).toBe('爆炸');
  });
});

/* ===================== 旧版静态比对（兼容保留） ===================== */

describe('classifyStatus 状态分类', () => {
  it('200 及 2xx 一律判为 pass', () => {
    expect(classifyStatus(200)).toBe('pass');
    expect(classifyStatus(201)).toBe('pass');
    expect(classifyStatus(204)).toBe('pass');
  });

  it('401 判为 auth / 403 判为 forbidden', () => {
    expect(classifyStatus(401)).toBe('auth');
    expect(classifyStatus(403)).toBe('forbidden');
  });

  it('5xx 与其余状态码按 fail 保守处理', () => {
    expect(classifyStatus(500)).toBe('fail');
    expect(classifyStatus(404)).toBe('fail');
    expect(classifyStatus(429)).toBe('fail');
  });
});

describe('classifyAuthRequirement 鉴权档分类（依据宪法第三章）', () => {
  it('公开白名单判 public', () => {
    expect(classifyAuthRequirement('/api/v1/health')).toBe('public');
    expect(classifyAuthRequirement('/api/v1/model-info')).toBe('public');
  });

  it('/api/v1/admin/* 判 admin（含 M135-A 冒烟自身）', () => {
    expect(classifyAuthRequirement('/api/v1/admin/users')).toBe('admin');
    expect(classifyAuthRequirement('/api/v1/admin/test/smoke')).toBe('admin');
  });

  it('其余默认判 auth', () => {
    expect(classifyAuthRequirement('/api/v1/muse/home')).toBe('auth');
    expect(classifyAuthRequirement('/api/v1/admission-notes')).toBe('auth');
  });
});

describe('summarize 旧版汇总', () => {
  it('空入参返回全零汇总', () => {
    expect(summarize([])).toEqual({
      total: 0,
      pass: 0,
      fail: 0,
      failures: [],
      byAuth: { public: 0, auth: 0, admin: 0 },
    });
  });

  it('fail 收集并保持顺序', () => {
    const results = [
      { method: 'GET', path: '/api/v1/a', status: 200, auth: 'auth' as const },
      { method: 'GET', path: '/bad', status: 500, note: '缺前缀', auth: 'auth' as const },
    ];
    const s = summarize(results);
    expect(s.pass).toBe(1);
    expect(s.fail).toBe(1);
    expect(s.failures[0].path).toBe('/bad');
  });
});

describe('buildSmokeResults 旧版静态比对兼容', () => {
  it('合法路径 200 并带 auth 标注', () => {
    const out = buildSmokeResults(['/api/v1/health', '/api/v1/admin/users/:id']);
    expect(out[0].auth).toBe('public');
    expect(out[1].auth).toBe('admin');
  });

  it('缺前缀与重复登记判 500', () => {
    const out = buildSmokeResults(['/bad', '/api/v1/a', '/api/v1/a']);
    expect(out[0].status).toBe(500);
    expect(out[2].status).toBe(500);
  });

  it('KNOWN_GET_ROUTES 全量遍历零失败', () => {
    const summary = summarize(buildSmokeResults(KNOWN_GET_ROUTES));
    expect(summary.fail).toBe(0);
    expect(summary.total).toBe(KNOWN_GET_ROUTES.length);
  });
});

/* ===================== M149-A 全路由冒烟（六前缀全覆盖） ===================== */

describe('FULL_ROUTE_INVENTORY 全量路由清单', () => {
  it('六前缀桶均有路由且总数覆盖全部已登记路径', () => {
    const buckets = new Set(FULL_ROUTE_INVENTORY.map((r) => r.bucket));
    expect(buckets.has('admin')).toBe(true);
    expect(buckets.has('doctor')).toBe(true);
    expect(buckets.has('nurse')).toBe(true);
    expect(buckets.has('pharma')).toBe(true);
    expect(buckets.has('patient')).toBe(true);
    expect(buckets.has('ai')).toBe(true);
    // 157 条唯一路径 × 多方法 = 173 条方法配对
    expect(FULL_ROUTE_INVENTORY.length).toBeGreaterThan(150);
  });

  it('全部路径以 /api/v1/ 开头，且 method+path 无重复', () => {
    const seen = new Set<string>();
    for (const r of FULL_ROUTE_INVENTORY) {
      expect(r.path.startsWith('/api/v1/')).toBe(true);
      const key = `${r.method.toUpperCase()} ${r.path}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('路径前缀与桶标注一致：admin/doctor/nurse/pharma/patient/ai', () => {
    for (const r of FULL_ROUTE_INVENTORY) {
      if (r.path.startsWith('/api/v1/admin/')) expect(r.bucket).toBe('admin');
      else if (r.path.startsWith('/api/v1/doctor/')) expect(r.bucket).toBe('doctor');
      else if (r.path.startsWith('/api/v1/nurse')) expect(r.bucket).toBe('nurse');
      else if (r.path.startsWith('/api/v1/pharma')) expect(r.bucket).toBe('pharma');
      else if (r.path.startsWith('/api/v1/patient/')) expect(r.bucket).toBe('patient');
      else expect(r.bucket).toBe('ai');
    }
  });
});

describe('smokeAllRoutes 纯函数编排（不发 HTTP 请求）', () => {
  it('默认清单返回完整 SmokeReport，门禁 ok=true（零结构漂移）', () => {
    const report = smokeAllRoutes();
    expect(report.total).toBe(FULL_ROUTE_INVENTORY.length);
    expect(report.fail).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.results).toHaveLength(FULL_ROUTE_INVENTORY.length);
  });

  it('admin 桶全部判 403 权限不足，其余受保护桶判 401 需认证', () => {
    const report = smokeAllRoutes();
    let adminCount = 0;
    let protectedCount = 0;
    for (const r of report.results) {
      if (r.path.startsWith('/api/v1/admin/')) {
        expect(r.status).toBe(403);
        adminCount += 1;
      } else {
        expect(r.status).toBe(401);
        protectedCount += 1;
      }
    }
    expect(adminCount).toBeGreaterThan(0);
    expect(protectedCount).toBeGreaterThan(0);
    expect(report.forbidden).toBe(adminCount);
    expect(report.auth).toBe(protectedCount);
  });

  it('四分类计数 byVerdict 互斥且合计等于总数', () => {
    const report = smokeAllRoutes();
    const { pass, fail, auth, forbidden } = report.byVerdict;
    expect(pass + fail + auth + forbidden).toBe(report.total);
    expect(report.pass).toBe(pass);
    expect(report.fail).toBe(fail);
    expect(report.auth).toBe(auth);
    expect(report.forbidden).toBe(forbidden);
  });

  it('byBucket 六桶独立累计 total/pass/fail', () => {
    const report = smokeAllRoutes();
    for (const b of ['admin', 'doctor', 'nurse', 'pharma', 'patient', 'ai'] as const) {
      expect(report.byBucket[b].total).toBeGreaterThan(0);
      // 受保护桶无 2xx，pass 为 0；无漂移则 fail 为 0
      expect(report.byBucket[b].fail).toBe(0);
    }
    const sumByBucket =
      report.byBucket.admin.total +
      report.byBucket.doctor.total +
      report.byBucket.nurse.total +
      report.byBucket.pharma.total +
      report.byBucket.patient.total +
      report.byBucket.ai.total;
    expect(sumByBucket).toBe(report.total);
  });

  it('注入含漂移的清单：缺前缀 / 重复登记判 500 失败并置顶', () => {
    const report = smokeAllRoutes(
      [
        { method: 'GET', path: '/bad/path', bucket: 'admin' },
        { method: 'GET', path: '/api/v1/admin/x', bucket: 'admin' },
        { method: 'GET', path: '/api/v1/admin/x', bucket: 'admin' },
        { method: 'POST', path: '/api/v1/patient/y', bucket: 'patient' },
      ],
      '2026-01-01T00:00:00Z',
    );
    expect(report.ok).toBe(false);
    expect(report.fail).toBe(2);
    expect(report.failures[0].note).toContain('/api/v1/');
    expect(report.failures[1].note).toContain('重复');
    expect(report.generatedAt).toBe('2026-01-01T00:00:00Z');
    // 合法 admin → 403；合法 patient → 401
    const adminOk = report.results.find((r) => r.path === '/api/v1/admin/x');
    const patientOk = report.results.find((r) => r.path === '/api/v1/patient/y');
    expect(adminOk?.status).toBe(403);
    expect(patientOk?.status).toBe(401);
  });

  it('空清单：total=0、ok=true、byVerdict 全零', () => {
    const report = smokeAllRoutes([], '2026-01-01T00:00:00Z');
    expect(report.total).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.byVerdict).toEqual({ pass: 0, fail: 0, auth: 0, forbidden: 0 });
  });
});
