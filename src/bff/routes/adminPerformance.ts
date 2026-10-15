/**
 * 健澜科技 jlmedaios - 系统性能监控 BFF 路由（M123-D）
 *
 * GET /api/v1/admin/performance
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回最近采样窗口的请求量 / p50 / p95 / p99 / 慢接口 Top10 / 按天错误率趋势；
 *  - 数据来自进程内存环形缓冲（performanceMonitorAggregator），不落库、不含 PII。
 *
 * 生产安全加固：
 *  - 不暴露底层采样明细，只暴露聚合结果；
 *  - 采集失败时返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何状态变更副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  aggregatePerformance,
  listPerformanceRecords,
} from '../aggregators/performanceMonitorAggregator';

export const adminPerformanceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 system:performance:view
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        const summary = aggregatePerformance(listPerformanceRecords());
        return json(ok(summary));
      } catch (err) {
        const message = err instanceof Error ? err.message : '性能监控数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
