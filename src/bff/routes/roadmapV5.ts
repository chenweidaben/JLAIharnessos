/**
 * 健澜科技 jlmedaios - v5.0 产品路线图 BFF 路由（M181-D）
 *
 * GET /api/v1/admin/roadmap/v5
 *  - auth: true + requirePermissionCode('system:roadmap:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 可选 query：?current=v4.9.0 指定当前版本号，缺省 v4.9.0；
 *  - 返回：三阶段元信息 + 全部事项 + 优先级排序（带排名/理由）+ 逐条工作量估算 + 关键里程碑（含 300 版本里程碑）。
 *
 * 生产安全加固：
 *  - 全部来自纯函数聚合，只读、不写库、不暴露 SQL 与 PII；
 *  - 失败时返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何状态变更副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  estimateEffortV5,
  generateRoadmapV5,
  prioritizeRoadmapItemsV5,
  type EffortV5,
  type PrioritizedItemV5,
  type RoadmapV5,
} from '../aggregators/roadmapV5Aggregator';

/** 缺省当前版本号（无 query 时）：v5.0 路线图从 v4.9.0 之后起步 */
const DEFAULT_CURRENT_VERSION_V5 = 'v4.9.0';

/** 单条事项的视图：事项本体 + 工作量估算 */
export interface RoadmapV5ItemView {
  item: RoadmapV5['items'][number];
  effort: EffortV5;
}

/** 路由聚合返回体 */
export interface RoadmapV5View {
  roadmap: RoadmapV5;
  prioritized: PrioritizedItemV5[];
  itemEfforts: RoadmapV5ItemView[];
}

export const roadmapV5Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/roadmap/v5',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码（复用 v4 路线图同一权限码）
      const denied = requirePermissionCode(c, 'system:roadmap:view');
      if (denied) return denied;
      try {
        const current = c.query.get('current')?.trim() || DEFAULT_CURRENT_VERSION_V5;

        // 纯函数：生成路线图 -> 优先级排序 -> 逐条工作量估算
        const roadmap = generateRoadmapV5(current);
        const prioritized = prioritizeRoadmapItemsV5(roadmap.items);
        const itemEfforts: RoadmapV5ItemView[] = roadmap.items.map((item) => ({
          item,
          effort: estimateEffortV5(item),
        }));

        const view: RoadmapV5View = { roadmap, prioritized, itemEfforts };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'v5.0 路线图数据聚合失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
