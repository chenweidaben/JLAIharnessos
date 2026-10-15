/**
 * 健澜科技 jlmedaios - M149-B 安全基线报告路由（管理端）
 *
 * GET /api/v1/admin/security/report（仅 admin）
 *
 * 行为约定（生产质量门禁）：
 *  - 不发起任何真实 HTTP / DB 请求；
 *  - 调用纯函数 securityBaselineCheck 执行七项基线核查，再经 generateSecurityReport
 *    汇总为红 / 黄 / 绿报告；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403（依据宪法第三章 requireRole）；
 *  - 返回结构与 web/src/pages/admin/security/Report/index.tsx 对齐。
 *
 * 七项检查：写认证 / SQL 注入 / XSS / 患者 PII 脱敏 / 错误不泄露 /
 *          token 过期 / 密码哈希 / 审计日志完整性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  generateSecurityReport,
  securityBaselineCheck,
  type BaselineReport,
} from '../aggregators/securityBaselineAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/** 被核查目标基地址（从请求推导，仅记录进报告头，不发起出站请求） */
function resolveBaseUrl(c: Ctx): string {
  const url = c.req.url ?? '';
  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).origin;
    } catch {
      /* fallthrough */
    }
  }
  // path-only 请求：从 Host 头重建 origin
  const host = c.req.headers.get('host');
  return host ? `http://${host}` : 'http://localhost';
}

export const securityReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/report',
    handle: (c: Ctx): Response => {
      // 仅 admin：未登录 401，非 admin 403（依赖宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const baseUrl = resolveBaseUrl(c);
      const results = securityBaselineCheck(baseUrl);
      // 生产质量门禁：generatedAt 由路由层注入，纯函数内不取时，便于单测断言
      const report: BaselineReport = generateSecurityReport(
        results,
        baseUrl,
        new Date().toISOString(),
      );

      return json(ok(report));
    },
    auth: true,
  },
];
