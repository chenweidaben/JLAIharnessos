/**
 * 健澜科技 jlmedaios - 前端性能 BFF 路由（M145-B）
 *
 * 【前端性能优化】
 *
 * GET /api/v1/admin/performance/frontend
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回：打包体积分析（analyzeBundleSize）+ 路由懒加载报告
 *    （generateLazyLoadingReport），数据来自本模块默认快照；
 *  - 【生产化收尾】纯函数即调即算，无 IO / 无状态变更，可安全高频轮询。
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
  analyzeBundleSize,
  DEFAULT_BUNDLE_STATS,
  DEFAULT_ROUTE_NODES,
  generateLazyLoadingReport,
  type BundleAnalysis,
  type LazyLoadingReport,
} from '../aggregators/frontendPerformanceAggregator';

/** 路由聚合返回体 */
export interface FrontendPerformanceView {
  bundle: BundleAnalysis;
  lazy: LazyLoadingReport;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const frontendPerformanceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/frontend',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        // 【前端性能优化】纯函数即调即算：打包体积 + 懒加载覆盖率一次出报告
        const bundle = analyzeBundleSize(DEFAULT_BUNDLE_STATS);
        const lazy = generateLazyLoadingReport(DEFAULT_ROUTE_NODES);
        const view: FrontendPerformanceView = {
          bundle,
          lazy,
          generatedAt: Date.now(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '前端性能数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
