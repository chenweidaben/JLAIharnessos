/**
 * 健澜科技 jlmedaios - M166-D 系统安全深化：渗透测试与漏洞扫描 BFF 路由
 *
 * GET /api/v1/admin/security/scan
 *  - auth: true + requirePermissionCode('system:security:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅安全负责人 / admin 可读）；
 *  - 返回：runSecurityScan() 五类攻击面报告（SQL 注入 / XSS / CSRF / 敏感信息泄露 / 认证绕过），
 *    漏洞带证据、按风险分降序，纯函数即调即算，不连数据库、不写 SQL、不新增表；
 *  - 【生产化收尾】无 IO / 无状态变更，可安全高频轮询。
 *
 * 生产安全加固：
 *  - 只读聚合结果，漏洞清单不含任何 PII；
 *  - 采集失败返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何写副作用，不触碰 WebSocket。
 *  - 【绩效与人才】漏洞闭环时效纳入季度绩效复盘。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import { runSecurityScan, type SecurityScanReport } from '../aggregators/securityScanAggregator';

/** 路由聚合返回体 */
export interface SecurityScanView {
  /** 五类攻击面扫描报告（漏洞按风险分降序） */
  report: SecurityScanReport;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const securityScanRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/scan',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:security:view');
      if (denied) return denied;
      try {
        // 【M166-D】纯函数即调即算：五类攻击面真检一次出报告
        const view: SecurityScanView = {
          report: runSecurityScan(),
          generatedAt: Date.now(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '安全扫描数据生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
