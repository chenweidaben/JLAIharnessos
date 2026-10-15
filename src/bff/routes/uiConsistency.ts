/**
 * 健澜科技 jlmedaios - M150-D UI 一致性与无障碍 BFF 路由
 *
 * GET /api/v1/admin/ui/consistency
 *  - auth: true + requirePermissionCode('system:ui:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin / 体验负责人可读）；
 *  - 返回：一致性报告（checkUIConsistency()）+ 无障碍报告（checkAccessibility()），
 *    两份报告均来自本模块纯函数的确定性种子基线，不连数据库、不读 DOM；
 *  - 【生产化收尾】纯函数即调即算，无 IO / 无状态变更，可安全高频轮询。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不含任何 PII；
 *  - 采集失败返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何写副作用，不触碰 WebSocket。
 *  - 【持续优化】后续接入真实前端静态扫描后，路由返回体结构保持不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  checkAccessibility,
  checkUIConsistency,
  type AccessibilityReport,
  type ConsistencyReport,
} from '../aggregators/uiConsistencyAggregator';

/** 路由聚合返回体 */
export interface UiConsistencyView {
  /** UI 一致性报告（五维度） */
  consistency: ConsistencyReport;
  /** 无障碍报告（对比度 / 键盘 / 读屏 / 表单 label） */
  accessibility: AccessibilityReport;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const uiConsistencyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/ui/consistency',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:ui:view');
      if (denied) return denied;
      try {
        // 【M150-D】纯函数即调即算：一致性五维度 + 无障碍四维度一次出报告
        const view: UiConsistencyView = {
          consistency: checkUIConsistency(),
          accessibility: checkAccessibility(),
          generatedAt: Date.now(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'UI 一致性与无障碍检查数据生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
