/* ============================================================================
 * 健澜科技数智医院智能体 - 系统健康监控 BFF 路由
 *
 * GET /api/v1/system/health/dashboard
 *  - 鉴权 + 权限码 system:view（admin 角色默认放行）；
 *  - 返回 BFF 进程 / DB 连接池 / outbox 积压 / agent 熔断四维状态与 overall 结论；
 *  - 各组件采集失败互不影响，分别降级（unknown），绝不以假数据冒充正常。
 *
 * 注意：本路径原由 routes/system.ts 的免鉴权探针占用，接入时需由上级统一处理
 * 旧探针（建议前端健康门禁切到公开的 /ready）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ==========================================================================*/

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import { collectHealth } from '../aggregators/systemHealthAggregator';

export const systemHealthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/system/health/dashboard',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限码守卫（未登录 401 / admin 放行 / 需显式权限码 system:view）
      const denied = requirePermissionCode(c, 'system:view');
      if (denied) return denied;
      try {
        const health = await collectHealth();
        return json(ok(health));
      } catch (err) {
        const message = err instanceof Error ? err.message : '系统健康状态采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
