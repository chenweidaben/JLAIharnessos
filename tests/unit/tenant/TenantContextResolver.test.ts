/**
 * 健澜科技数智医院智能体（jlmedaios）— TenantContextResolver 单元测试
 *
 * 覆盖：默认租户回退、多租户关闭回退、未知/停用租户拒绝、院区归属校验、
 *       跨院区拒绝、从 Request/Headers 解析。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, test } from 'bun:test';

import {
  TenantContextResolver,
  TenantService,
} from '../../../src/tenant';

/** 全新服务 + 全新解析器，固定默认租户 t1/c1 */
function fresh(opts: { multiTenantEnabled?: boolean } = {}): {
  svc: TenantService;
  resolver: TenantContextResolver;
} {
  const svc = new TenantService({ defaultTenantId: 't1', defaultCampusId: 'c1' });
  const resolver = new TenantContextResolver(svc, { multiTenantEnabled: opts.multiTenantEnabled });
  return { svc, resolver };
}

describe('TenantContextResolver - 默认回退', () => {
  test('未指定任何租户时回退默认租户', () => {
    const { resolver } = fresh();
    const ctx = resolver.resolve({});
    expect(ctx.tenantId).toBe('t1');
    expect(ctx.campusId).toBe('c1');
    expect(ctx.hospitalId).toBe('t1');
    expect(ctx.enabled).toBe(true);
  });

  test('多租户关闭时，即使指定其他租户也强制回退默认', () => {
    const { svc, resolver } = fresh({ multiTenantEnabled: false });
    const h2 = svc.createHospital('第二医院');
    const ctx = resolver.resolve({ tenantId: h2.id });
    expect(ctx.tenantId).toBe('t1');
    expect(resolver.isMultiTenantEnabled()).toBe(false);
  });
});

describe('TenantContextResolver - 拒绝非法租户', () => {
  test('未知租户 id → 抛错', () => {
    const { resolver } = fresh();
    expect(() => resolver.resolve({ tenantId: 'ghost' })).toThrow(/租户不存在/);
  });

  test('已停用租户 → 抛错', () => {
    const { svc, resolver } = fresh();
    const h2 = svc.createHospital('第二医院');
    svc.setEnabled(h2.id, false);
    expect(() => resolver.resolve({ tenantId: h2.id })).toThrow(/已停用/);
  });

  test('已软删租户 → 抛错', () => {
    const { svc, resolver } = fresh();
    const h2 = svc.createHospital('第二医院');
    svc.softDelete(h2.id);
    expect(() => resolver.resolve({ tenantId: h2.id })).toThrow(/已删除/);
  });
});

describe('TenantContextResolver - 院区归属校验', () => {
  test('指定本医院下的院区 → 成功', () => {
    const { svc, resolver } = fresh();
    const h2 = svc.createHospital('第二医院');
    const c2 = svc.createCampus(h2.id, '东院区');
    const ctx = resolver.resolve({ tenantId: h2.id, campusId: c2.id });
    expect(ctx.tenantId).toBe(h2.id);
    expect(ctx.campusId).toBe(c2.id);
    expect(ctx.hospitalId).toBe(h2.id);
  });

  test('A 医院请求 B 医院的院区 → 拒绝（越权跨院区）', () => {
    const { svc, resolver } = fresh();
    const h2 = svc.createHospital('第二医院');
    const c2 = svc.createCampus(h2.id, '东院区');
    // 默认租户 t1 请求 h2 的院区
    expect(() => resolver.resolve({ tenantId: 't1', campusId: c2.id })).toThrow(/不属于医院/);
  });

  test('指定的 campusId 实际是医院节点 → 拒绝', () => {
    const { resolver } = fresh();
    // t1 是医院，却被当作 campusId
    expect(() => resolver.resolve({ tenantId: 't1', campusId: 't1' })).toThrow(/不是院区/);
  });
});

describe('TenantContextResolver - 从 HTTP 头解析', () => {
  test('X-Tenant-Id / X-Campus-Id 头被正确读取', () => {
    const { svc, resolver } = fresh();
    const h2 = svc.createHospital('第二医院');
    const c2 = svc.createCampus(h2.id, '东院区');
    const req = new Request('http://x/api', {
      headers: { 'X-Tenant-Id': h2.id, 'X-Campus-Id': c2.id },
    });
    const ctx = resolver.resolveFromRequest(req);
    expect(ctx.tenantId).toBe(h2.id);
    expect(ctx.campusId).toBe(c2.id);
  });

  test('无头时回退默认', () => {
    const { resolver } = fresh();
    const req = new Request('http://x/api');
    const ctx = resolver.resolveFromRequest(req);
    expect(ctx.tenantId).toBe('t1');
    expect(ctx.campusId).toBe('c1');
  });

  test('Headers 直传同样可用', () => {
    const { resolver } = fresh();
    const headers = new Headers({ 'X-Tenant-Id': 't1' });
    const ctx = resolver.resolveFromHeaders(headers);
    expect(ctx.tenantId).toBe('t1');
  });
});
