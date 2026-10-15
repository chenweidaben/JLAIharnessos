/**
 * 健澜科技 jlmedaios - 数据库性能监控 BFF 路由（M145-A · 生产化收尾）
 *
 * GET /api/v1/admin/performance/slow-queries
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回核心表慢查询目录（analyzeSlowQueries）+ 推荐索引清单（recommendCoreIndexes）；
 *  - 数据来自纯函数聚合器，不落库、不含 SQL 绑定参数值 / PII。
 *
 * 生产安全加固：
 *  - 不暴露底层慢日志明细，只暴露模板摘要与索引建议；
 *  - 采集失败时返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何状态变更副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  analyzeSlowQueries,
  recommendCoreIndexes,
} from '../aggregators/dbPerformanceAggregator';

export const dbPerformanceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/slow-queries',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 system:performance:view
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        // 【生产化收尾】纯函数产出，无 IO、无 PII
        const slowQueries = analyzeSlowQueries();
        const suggestions = recommendCoreIndexes();
        return json(ok({ slowQueries, suggestions }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '数据库性能数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
