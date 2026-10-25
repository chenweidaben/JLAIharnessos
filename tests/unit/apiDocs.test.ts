/**
 * 健澜科技 jlmedaios - M129-A 统一 API 文档单测【系统集成】
 *
 * 验证三件事：
 *  - 文档生成：generateApiDocs 产出合法 OpenAPI3 结构（info/paths/components/security）；
 *  - 路由覆盖：各业务 tag 均有路由、路径参数 :id 转为 {id}、GET 带分页参数、
 *    鉴权路由带 401/403、公开路由（探活）不带鉴权；
 *  - 格式校验：无残留 :param、每个操作都有 200 与默认错误响应、Bearer 方案正确。
 * 纯函数断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  documentRoute,
  generateApiDocs,
  type OpenApi3,
} from '../../src/bff/aggregators/apiDocsAggregator';

describe('M129-A documentRoute 规范化', () => {
  it('method 统一大写，缺省 tags=系统集成、auth=true', () => {
    const doc = documentRoute('get', '/api/v1/patients/{id}');
    expect(doc.method).toBe('GET');
    expect(doc.tags).toEqual(['系统集成']);
    expect(doc.auth).toBe(true);
  });

  it('可覆写 summary/tags/auth/requestBody', () => {
    const doc = documentRoute('post', '/api/v1/auth/login', {
      summary: '登录',
      tags: ['认证与权限'],
      auth: false,
      requestBody: { type: 'object' },
    });
    expect(doc.summary).toBe('登录');
    expect(doc.auth).toBe(false);
    expect(doc.requestBody).toBeDefined();
  });
});

describe('M129-A generateApiDocs 文档生成', () => {
  const docs: OpenApi3 = generateApiDocs();

  it('OpenAPI 版本与 info/许可证正确', () => {
    expect(docs.openapi).toMatch(/^3\./);
    expect(docs.info.title).toContain('健澜AI原生医院操作系统OS');
    expect(docs.info.license.name).toContain('杭州健澜科技有限公司');
  });

  it('全局注入 JWT Bearer 安全方案', () => {
    const scheme = docs.components.securitySchemes.bearerAuth;
    expect(scheme.type).toBe('http');
    expect(scheme.scheme).toBe('bearer');
    expect(scheme.bearerFormat).toBe('JWT');
    expect(docs.security).toEqual([{ bearerAuth: [] }]);
  });

  it('components 含统一信封 / 错误信封 / 分页列表 schema', () => {
    expect(docs.components.schemas.ApiResponse).toBeDefined();
    expect(docs.components.schemas.ErrorEnvelope).toBeDefined();
    expect(docs.components.schemas.PagedList).toBeDefined();
  });

  it('info.description 覆盖错误码表与分页规范', () => {
    expect(docs.info.description).toContain('40101');
    expect(docs.info.description).toContain('pageSize');
    expect(docs.info.description).toContain('Bearer');
  });
});

describe('M129-A 路由覆盖', () => {
  const docs = generateApiDocs();
  const allOps = Object.entries(docs.paths).flatMap(([path, byMethod]) =>
    Object.entries(byMethod).map(([method, op]) => ({ path, method, op })),
  );

  it('覆盖全部声明的业务 tag', () => {
    const tags = new Set(allOps.flatMap((o) => o.op.tags ?? []));
    for (const t of [
      '系统健康',
      '认证与权限',
      '患者中心',
      '住院',
      '护理',
      '结算与医保',
      'AI 辅助',
      '智能体运行',
      '系统管理',
    ]) {
      expect(tags.has(t)).toBe(true);
    }
  });

  it('路径参数 :id 已转为 OpenAPI {id} 并生成 path 参数', () => {
    const order = docs.paths['/api/v1/inpatient/orders/{id}/review'];
    expect(order).toBeDefined();
    expect(order.post.parameters?.some((p) => p.name === 'id' && p.in === 'path')).toBe(true);
  });

  it('GET 列表接口携带 page/pageSize 分页规范参数', () => {
    const list = docs.paths['/api/v1/admin/users'].get;
    const names = (list.parameters ?? []).map((p) => p.name);
    expect(names).toContain('page');
    expect(names).toContain('pageSize');
  });

  it('鉴权接口声明 401 与 403 响应', () => {
    const user = docs.paths['/api/v1/auth/userinfo'].get;
    expect(user.responses['401']).toBeDefined();
    expect(user.responses['403']).toBeDefined();
  });

  it('公开探活接口（/health）关闭安全要求且无 401', () => {
    const health = docs.paths['/api/v1/health'].get;
    expect(health.security).toEqual([]);
    expect(health.responses['401']).toBeUndefined();
  });
});

describe('M129-A 格式校验', () => {
  const docs = generateApiDocs();
  const allOps = Object.entries(docs.paths).flatMap(([path, byMethod]) =>
    Object.entries(byMethod).map(([method, op]) => ({ path, method, op })),
  );

  it('所有路径 key 无残留 :param 占位', () => {
    for (const p of Object.keys(docs.paths)) {
      expect(p).not.toMatch(/:\w+/);
    }
  });

  it('每个操作都有 200 与 500 响应，且 method 为小写', () => {
    expect(allOps.length).toBeGreaterThan(20);
    for (const o of allOps) {
      expect(o.op.responses['200']).toBeDefined();
      expect(o.op.responses['500']).toBeDefined();
      expect(o.method).toBe(o.method.toLowerCase());
    }
  });
});
