/**
 * 健澜科技 jlmedaios - M158-C 首屏与缓存性能持续优化 BFF 路由
 *
 * 【v4.x近期】
 *
 * GET /api/v1/admin/performance/firstload
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回：七项首屏优化措施（optimizeFirstLoad）+
 *    三类缓存策略（buildCacheStrategy）+
 *    优化前后 FCP/LCP/TTI 对比（measureFirstLoadTime）；
 *  - 纯函数聚合，无数据库副作用，不含 PII / SQL。
 *
 * 生产安全加固：
 *  - 只读聚合结果，措施为「已落地 + 预期收益」，不直接改运行时配置；
 *  - 仅 GET，无任何状态变更副作用；
 *  - 异常时返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildCacheStrategy,
  measureFirstLoadTime,
  optimizeFirstLoad,
} from '../aggregators/firstLoadAggregator';

/** 路由聚合返回体 */
export interface FirstLoadView {
  optimization: ReturnType<typeof optimizeFirstLoad>;
  cache: ReturnType<typeof buildCacheStrategy>;
  metrics: ReturnType<typeof measureFirstLoadTime>;
}

export const firstLoadRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/firstload',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        const view: FirstLoadView = {
          optimization: optimizeFirstLoad(),
          cache: buildCacheStrategy(),
          metrics: measureFirstLoadTime(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '首屏性能数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
