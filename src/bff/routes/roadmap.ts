/**
 * 健澜科技 jlmedaios - v4.x 产品路线图 BFF 路由（M157-D）
 *
 * GET /api/v1/admin/roadmap
 *  - auth: true + requirePermissionCode('system:roadmap:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 可选 query：?current=v3.9.0 指定当前版本号，缺省 v3.9.0；
 *  - 返回：三阶段元信息 + 全部事项 + 优先级排序（带排名/理由）+ 逐条工作量估算 + 关键里程碑。
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
  estimateEffort,
  generateRoadmap,
  prioritizeRoadmapItems,
  type Effort,
  type PrioritizedItem,
  type Roadmap,
} from '../aggregators/roadmapAggregator';

/** 缺省当前版本号（无 query 时） */
const DEFAULT_CURRENT_VERSION = 'v3.9.0';

/** 单条事项的视图：事项本体 + 工作量估算 */
export interface RoadmapItemView {
  item: Roadmap['items'][number];
  effort: Effort;
}

/** 路由聚合返回体 */
export interface RoadmapView {
  roadmap: Roadmap;
  prioritized: PrioritizedItem[];
  itemEfforts: RoadmapItemView[];
}

export const roadmapRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/roadmap',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:roadmap:view');
      if (denied) return denied;
      try {
        const current = c.query.get('current')?.trim() || DEFAULT_CURRENT_VERSION;

        // 纯函数：生成路线图 -> 优先级排序 -> 逐条工作量估算
        const roadmap = generateRoadmap(current);
        const prioritized = prioritizeRoadmapItems(roadmap.items);
        const itemEfforts: RoadmapItemView[] = roadmap.items.map((item) => ({
          item,
          effort: estimateEffort(item),
        }));

        const view: RoadmapView = { roadmap, prioritized, itemEfforts };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '路线图数据聚合失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
