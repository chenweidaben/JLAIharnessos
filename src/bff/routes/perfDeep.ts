/**
 * 健澜科技 jlmedaios - M165-D 系统性能与稳定性持续优化深度审计 BFF 路由
 *
 * 【CDSS与运营精细化】
 *
 * GET /api/v1/admin/performance/deep-audit
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回：五维深度性能审计（deepPerformanceAudit）+
 *    索引建议（optimizeDatabaseIndex）+
 *    熔断器指标（buildCircuitBreakerMetrics）+
 *    健康检查面板（buildHealthCheckDashboard）；
 *  - 纯函数聚合，无数据库副作用，不暴露 SQL 文本与 PII。
 *
 * 生产安全加固：
 *  - 只读聚合结果，索引建议为「建议 + 预期收益」，不直接执行 DDL / 不触发迁移；
 *  - 仅 GET，无任何状态变更副作用；
 *  - 异常时返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildCircuitBreakerMetrics,
  buildHealthCheckDashboard,
  deepPerformanceAudit,
  optimizeDatabaseIndex,
} from '../aggregators/perfDeepAggregator';

/** 路由聚合返回体 */
export interface PerfDeepView {
  audit: ReturnType<typeof deepPerformanceAudit>;
  indexOptimization: ReturnType<typeof optimizeDatabaseIndex>;
  circuitBreakers: ReturnType<typeof buildCircuitBreakerMetrics>;
  health: ReturnType<typeof buildHealthCheckDashboard>;
}

export const perfDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/deep-audit',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        const view: PerfDeepView = {
          audit: deepPerformanceAudit(),
          indexOptimization: optimizeDatabaseIndex(),
          circuitBreakers: buildCircuitBreakerMetrics(),
          health: buildHealthCheckDashboard(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '性能深度审计数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
