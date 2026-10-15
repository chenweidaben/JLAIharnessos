/**
 * 健澜科技 jlmedaios - 系统监控指标 BFF 路由（M145-C 生产化收尾）
 *
 * GET /api/v1/admin/metrics
 *  - auth: true + requirePermissionCode('system:metrics:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 查询参数 hours（窗口小时数，默认 1，取值范围 1..72，越界收敛）；
 *  - 返回七类指标最新值 / 逐类型小时趋势 / 超阈值告警（P95>1s /
 *    错误率>1% / 内存>90%）/ 规则定义，供 admin 仪表盘展示。
 *
 * 生产安全加固：
 *  - 不暴露底层采样明细，只暴露聚合结果与告警；
 *  - 采集失败时返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何状态变更副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDashboardView,
  listRecentMetrics,
} from '../aggregators/systemMetricsAggregator';

export const systemMetricsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/metrics',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 system:metrics:view
      const denied = requirePermissionCode(c, 'system:metrics:view');
      if (denied) return denied;
      try {
        // 窗口小时数：默认 1，越界收敛到 1..72（防止 hours=0 / 负数 / 超大值拖垮聚合）
        const rawHours = Number(c.query.get('hours') ?? '1');
        const hours = Number.isFinite(rawHours)
          ? Math.min(72, Math.max(1, Math.floor(rawHours)))
          : 1;
        const dashboard = buildDashboardView(listRecentMetrics(hours * 3_600_000), hours);
        return json(ok(dashboard));
      } catch (err) {
        const message = err instanceof Error ? err.message : '系统监控指标采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
