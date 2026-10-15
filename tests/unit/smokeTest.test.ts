/**
 * 健澜科技 jlmedaios - 路由回归冒烟测试纯函数单元测试
 *
 * 覆盖：
 *  - classifyStatus：状态码四分类（pass / auth / forbidden / fail）
 *  - summarize：失败收集与汇总计算
 *  - buildSmokeResults：静态清单结构一致性比对
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  classifyStatus,
  summarize,
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

describe('summarize 汇总计算与失败收集', () => {
  it('空入参返回全零汇总', () => {
    const s = summarize([]);
    expect(s).toEqual({ total: 0, pass: 0, fail: 0, failures: [] });
  });

  it('全部 pass 时 fail 为 0、failures 为空', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/a', status: 200 },
      { method: 'GET', path: '/api/v1/b', status: 200 },
    ];
    const s = summarize(results);
    expect(s.total).toBe(2);
    expect(s.pass).toBe(2);
    expect(s.fail).toBe(0);
    expect(s.failures).toEqual([]);
  });

  it('收集所有 fail 结果并保持入参顺序', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/a', status: 200 },
      { method: 'GET', path: '/missing-1', status: 500, note: '缺前缀' },
      { method: 'GET', path: '/api/v1/b', status: 200 },
      { method: 'GET', path: '/dup', status: 500, note: '重复登记' },
    ];
    const s = summarize(results);
    expect(s.total).toBe(4);
    expect(s.pass).toBe(2);
    expect(s.fail).toBe(2);
    expect(s.failures.map((f) => f.path)).toEqual(['/missing-1', '/dup']);
  });

  it('auth / forbidden 既不计入 pass 也不计入 fail', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/open', status: 200 },
      { method: 'GET', path: '/api/v1/authz', status: 401 },
      { method: 'GET', path: '/api/v1/admin-zone', status: 403 },
      { method: 'GET', path: '/api/v1/broken', status: 500 },
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

  it('failures 明细包含原始 note 与 status', () => {
    const results: SmokeRouteResult[] = [
      { method: 'GET', path: '/api/v1/x', status: 500, note: '路由重复登记' },
    ];
    const s = summarize(results);
    expect(s.failures[0]).toEqual({
      method: 'GET',
      path: '/api/v1/x',
      status: 500,
      note: '路由重复登记',
    });
  });
});

describe('buildSmokeResults 静态清单结构比对', () => {
  it('合法 /api/v1 路径产出 200 pass', () => {
    const out = buildSmokeResults(['/api/v1/health', '/api/v1/admin/users/:id']);
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.status === 200 && r.method === 'GET')).toBe(true);
  });

  it('缺少 /api/v1/ 前缀产出 500 fail 并写明原因', () => {
    const out = buildSmokeResults(['/health']);
    expect(out[0].status).toBe(500);
    expect(out[0].note).toContain('/api/v1/');
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
});
