/**
 * 健澜科技 jlmedaios - M167-B 安全漏洞修复（CSRF 与认证绕过）纯函数单元测试
 *
 * 覆盖：
 *  - verifyCSRFProtection：全部写操作端点 CSRF 覆盖复验（零漏保、双绿）
 *  - verifyAuthGuards：全部敏感路由认证守卫覆盖复验（零漏保、双绿）
 *  - 纯函数性：重复调用结果逐字节一致
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  SENSITIVE_ROUTES,
  verifyAuthGuards,
  verifyCSRFProtection,
  WRITE_ENDPOINTS,
  WRITE_METHODS,
  type AuthGuardReport,
  type CSRFReport,
} from '../../src/bff/aggregators/authFixAggregator.js';

describe('verifyCSRFProtection —— CSRF 防护复验', () => {
  it('返回写操作目录且全部为状态变更方法', () => {
    const report: CSRFReport = verifyCSRFProtection();
    expect(report.totalEndpoints).toBe(WRITE_ENDPOINTS.length);
    expect(report.items.length).toBe(WRITE_ENDPOINTS.length);
    for (const item of report.items) {
      expect(WRITE_METHODS).toContain(item.method);
    }
  });

  it('M167-B 修复后：零漏保、双绿通过', () => {
    const report = verifyCSRFProtection();
    expect(report.unprotectedCount).toBe(0);
    expect(report.gaps.length).toBe(0);
    expect(report.compliant).toBe(true);
    expect(report.protectedCount).toBe(report.totalEndpoints);
  });

  it('通过率 100 分', () => {
    const report = verifyCSRFProtection();
    expect(report.score).toBe(100);
  });

  it('每条写操作端点均受 CSRF 保护', () => {
    const { items } = verifyCSRFProtection();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.protected).toBe(true);
      expect(item.remediation).toBeUndefined();
    }
  });

  it('标准与版权归属正确', () => {
    const report = verifyCSRFProtection();
    expect(report.standard).toContain('CSRF');
    expect(report.copyright).toContain('杭州健澜科技有限公司');
    expect(report.fixes.length).toBeGreaterThan(0);
  });

  it('纯函数：重复调用结果逐字节一致', () => {
    expect(verifyCSRFProtection()).toEqual(verifyCSRFProtection());
  });
});

describe('verifyAuthGuards —— 认证守卫复验', () => {
  it('返回敏感路由目录且 authRequired 全部为 true', () => {
    const report: AuthGuardReport = verifyAuthGuards();
    expect(report.totalRoutes).toBe(SENSITIVE_ROUTES.length);
    expect(report.items.length).toBe(SENSITIVE_ROUTES.length);
    for (const item of report.items) {
      expect(item.authRequired).toBe(true);
    }
  });

  it('M167-B 修复后：零漏保、双绿通过', () => {
    const report = verifyAuthGuards();
    expect(report.unprotectedCount).toBe(0);
    expect(report.gaps.length).toBe(0);
    expect(report.compliant).toBe(true);
    expect(report.protectedCount).toBe(report.totalRoutes);
  });

  it('通过率 100 分', () => {
    const report = verifyAuthGuards();
    expect(report.score).toBe(100);
  });

  it('每条敏感路由均有 role 或 permission 守卫（避免认证但未授权）', () => {
    const { items } = verifyAuthGuards();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.pass).toBe(true);
      expect(['role', 'permission']).toContain(item.guardKind);
      expect(item.remediation).toBeUndefined();
      if (item.guardKind === 'permission') {
        expect(item.permissionCode).toBeDefined();
      }
      if (item.guardKind === 'role') {
        expect(item.role).toBeDefined();
      }
    }
  });

  it('admin 类路由使用 role=admin 守卫', () => {
    const { items } = verifyAuthGuards();
    const adminRoutes = items.filter((i) => i.path.startsWith('/api/v1/admin/'));
    expect(adminRoutes.length).toBeGreaterThan(0);
    for (const r of adminRoutes) {
      // admin 类路由要么 role=admin，要么 permission（如 security:view）
      expect(['role', 'permission']).toContain(r.guardKind);
    }
  });

  it('本路由 /api/v1/admin/security/auth-verify 在目录内且通过', () => {
    const { items } = verifyAuthGuards();
    const self = items.find((i) => i.path === '/api/v1/admin/security/auth-verify');
    expect(self).toBeDefined();
    expect(self!.pass).toBe(true);
    expect(self!.guardKind).toBe('permission');
    expect(self!.permissionCode).toBe('system:security:view');
  });

  it('标准与版权归属正确', () => {
    const report = verifyAuthGuards();
    expect(report.standard).toContain('RBAC');
    expect(report.copyright).toContain('杭州健澜科技有限公司');
    expect(report.fixes.length).toBeGreaterThan(0);
  });

  it('纯函数：重复调用结果逐字节一致', () => {
    expect(verifyAuthGuards()).toEqual(verifyAuthGuards());
  });
});
