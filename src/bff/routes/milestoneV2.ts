/**
 * 健澜科技 jlmedaios — 【300版本里程碑】里程碑总结 BFF 路由 V2（M181-A）
 *
 * GET /api/v1/admin/milestone/v2（仅 admin，依据宪法第三章）
 *
 * 行为约定：
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403；
 *  - 调用纯函数 generateMilestoneSummaryV2：返回「300 版本里程碑预告」关键口径
 *    （累计版本 296 / 切片 288 / 测试覆盖率 99.5% / P95 72ms /
 *      路由数 200+ / 迁移数 370+ / 功能模块 / 近四版本 v4.94~v4.97）；
 *  - 路由层不做任何 I/O（纯函数已内聚全部运算），异常由统一错误中间件兜底。
 *
 * 用途：管理端「300 版本里程碑预告」看板直读本接口。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { generateMilestoneSummaryV2 } from '../aggregators/milestoneV2Aggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

export const milestoneV2Routes: RouteDef[] = [
  {
    // 【300版本里程碑】里程碑预告总结（仅 admin）
    method: 'GET',
    path: '/api/v1/admin/milestone/v2',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      // 纯函数编排：固定里程碑口径 → 预告总结（generatedAt 由路由层注入当前时间）
      const summary = generateMilestoneSummaryV2({
        generatedAt: new Date().toISOString(),
      });

      return json(ok(summary));
    },
    auth: true,
  },
];
