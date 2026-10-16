/**
 * 健澜科技 jlmedaios - M167-A 安全漏洞修复：SQL 注入与 XSS 修复验证 BFF 路由
 *
 * GET /api/v1/admin/security/verify
 *  - auth: true + requirePermissionCode('system:security:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅安全负责人 / admin 可读）；
 *  - 返回：verifyNoSQLInjection() 参数化复验 + verifyNoXSS() 输出转义复验，
 *    两份结果均来自本模块纯函数的确定性运算，不连数据库、不读磁盘、不写 SQL；
 *  - 【安全修复与质量提升】针对 M166-D 渗透扫描暴露的 SQL 注入 / XSS 两类高危项，
 *    确认「参数化 $n 占位」与「escapeHtml 输出转义」修复真的闭环。
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
  verifyNoSQLInjection,
  verifyNoXSS,
  type SqlInjectionVerifyResult,
  type XssVerifyResult,
} from '../aggregators/securityFixAggregator';

/** 路由聚合返回体 */
export interface SecurityFixVerifyView {
  /** SQL 注入修复复验（参数化占位 / 零 ${} 插值） */
  sqlInjection: SqlInjectionVerifyResult;
  /** XSS 修复复验（dangerouslySetInnerHTML 全部转义 / 消毒） */
  xss: XssVerifyResult;
  /** 修复是否整体闭环（两项均 passed） */
  allPassed: boolean;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const securityFixRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/verify',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:security:view');
      if (denied) return denied;
      try {
        // 【M167-A】纯函数即调即算：SQL 注入 + XSS 两项修复复验一次出报告
        const sqlInjection = verifyNoSQLInjection();
        const xss = verifyNoXSS();
        const view: SecurityFixVerifyView = {
          sqlInjection,
          xss,
          allPassed: sqlInjection.passed && xss.passed,
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
