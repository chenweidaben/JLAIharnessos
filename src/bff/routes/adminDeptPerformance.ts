/**
 * 健澜科技 jlmedaios - 科室绩效分析 BFF 路由（管理驾驶舱 M127-B）
 *
 * GET /api/v1/admin/performance/dept?deptCode=xxx&range=2026-10
 *  - 无 deptCode：返回全院科室排名表（rankDepts）；
 *  - 带 deptCode：返回该科室五维绩效报告（buildDeptPerformanceReport）；
 *  - auth 守卫：未登录 401 / admin 放行 / 其余需显式权限码 dept:performance:view，否则 403。
 *
 * 生产安全加固：
 *  - 纯聚合结果，不暴露患者级 PII；
 *  - deptCode 未命中 → 400 结构化错误信封，不抛 500；
 *  - 仅 GET，无任何状态变更副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDeptPerformanceReport,
  DEMO_DEPT_PERF_DATA,
  rankDepts,
} from '../aggregators/deptPerformanceAggregator';

export const adminDeptPerformanceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/dept',
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 dept:performance:view
      const denied = requirePermissionCode(c, 'dept:performance:view');
      if (denied) return denied;

      try {
        const deptCode = c.query.get('deptCode');
        const timeRange = c.query.get('range') ?? '本月';

        if (deptCode) {
          const report = buildDeptPerformanceReport(
            deptCode,
            timeRange,
            DEMO_DEPT_PERF_DATA,
          );
          return json(ok({ type: 'report', report }));
        }

        const ranked = rankDepts(DEMO_DEPT_PERF_DATA);
        return json(ok({ type: 'ranking', timeRange, ranked }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '科室绩效数据加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
