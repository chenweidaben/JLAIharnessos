/**
 * 健澜科技 jlmedaios - M167-B 安全漏洞修复（CSRF 与认证绕过）验证 BFF 路由
 *
 * GET /api/v1/admin/security/auth-verify
 *  - auth: true + requirePermissionCode('system:security:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅安全负责人可读）；
 *  - 返回：CSRF 防护验证（verifyCSRFProtection()）+ 认证守卫验证（verifyAuthGuards()），
 *    两份结果均来自本模块纯函数的确定性运算，不连数据库、不写 SQL；
 *  - 【安全修复与质量提升】针对两类高危漏洞（CSRF 漏保 / 敏感路由认证绕过）
 *    给出修复映射与复验结论。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不含任何 PII；
 *  - 采集失败返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何写副作用，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  verifyAuthGuards,
  verifyCSRFProtection,
  type AuthGuardReport,
  type CSRFReport,
} from '../aggregators/authFixAggregator';

/** 路由聚合返回体 */
export interface AuthFixView {
  /** CSRF 防护验证报告 */
  csrf: CSRFReport;
  /** 认证守卫验证报告 */
  authGuards: AuthGuardReport;
  /** 整体是否双绿 */
  allGreen: boolean;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const authFixRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/auth-verify',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:security:view');
      if (denied) return denied;
      try {
        // 【M167-B】纯函数即调即算：CSRF 复验 + 认证守卫复验一次出报告
        const csrf = verifyCSRFProtection();
        const authGuards = verifyAuthGuards();
        const view: AuthFixView = {
          csrf,
          authGuards,
          allGreen: csrf.compliant && authGuards.compliant,
          generatedAt: Date.now(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '安全修复验证数据生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
