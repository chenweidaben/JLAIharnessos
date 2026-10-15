/* ============================================================================
 * 健澜科技数智医院智能体 - 系统智能度监控 BFF 路由（M119-D）
 *
 * GET /api/v1/muse/system/intelligence
 *  - 依据宪法第七章（AI 原生医院 / MUSE 智能体治理）：对全院智能体智能度做统一量化；
 *  - 鉴权 + 仅 admin 角色可访问（requireRole('admin')，未登录 401 / 非 admin 403）；
 *  - 返回四项核心指标现值、趋势序列与告警列表（纯函数聚合，无 IO 副作用）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ==========================================================================*/

import { requireRole } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildSystemIntelligenceDashboard,
  collectRawMetrics,
} from '../aggregators/systemIntelligenceAggregator';

export const museSystemIntelligenceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/system/intelligence',
    auth: true,
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 一律 403
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const dashboard = buildSystemIntelligenceDashboard(collectRawMetrics());
        return json(ok(dashboard));
      } catch (err) {
        const message = err instanceof Error ? err.message : '系统智能度看板采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
