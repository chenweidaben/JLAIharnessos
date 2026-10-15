/**
 * 健澜科技 jlmedaios - M151-D 系统性能持续优化 BFF 路由
 *
 * 【质量补齐与新场景】
 *
 * GET /api/v1/admin/performance/optimize
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回：慢查询识别 + 优化动作清单（optimizeSlowQueries）+
 *    优化前后 P50/P95/P99 对比（getPerformanceImprovementReport）；
 *  - 纯函数聚合，无数据库副作用，不暴露 SQL 文本与 PII。
 *
 * 生产安全加固：
 *  - 只读聚合结果，优化措施为「建议 + 预期收益」，不直接执行 DDL / 不触发迁移；
 *  - 仅 GET，无任何状态变更副作用；
 *  - 异常时返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  getPerformanceImprovementReport,
  optimizeSlowQueries,
} from '../aggregators/perfOptimizeAggregator';

/** 路由聚合返回体 */
export interface PerfOptimizeView {
  optimization: ReturnType<typeof optimizeSlowQueries>;
  comparison: ReturnType<typeof getPerformanceImprovementReport>;
}

export const perfOptimizeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/optimize',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        const view: PerfOptimizeView = {
          optimization: optimizeSlowQueries(),
          comparison: getPerformanceImprovementReport(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '性能优化数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
