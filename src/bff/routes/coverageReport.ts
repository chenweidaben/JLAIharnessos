/**
 * 健澜科技 jlmedaios - M150-A 测试覆盖率冲刺报告 BFF 路由（80%→90% 门禁）
 *
 * GET /api/v1/admin/test/coverage（仅 admin，依据宪法第三章）
 *
 * 行为约定：
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403；
 *  - 调用纯函数 generateCoverageReport：以确定性种子模拟覆盖基线，
 *    产出整体覆盖率、分桶统计、缺口清单与爬坡趋势；
 *  - 门禁阈值默认 90%：核心四桶（doctor/nurse/pharma/admin）全部 ≥ 90% 即 gateOk；
 *  - 路由层不做任何 I/O（纯函数已内聚全部运算），异常由统一错误中间件兜底。
 *
 * 用途：发版 / 冲刺期快速识别距 90% 目标的缺口，
 *       前端报告页（web/src/pages/admin/test/Coverage）直读本接口。
 *
 * 持续优化：后续把模拟基线替换为真实 lcov/json 行覆盖率解析。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { generateCoverageReport } from '../aggregators/coverageReportAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

export const coverageReportRoutes: RouteDef[] = [
  {
    // M150-A 测试覆盖率冲刺报告（90% 门禁，仅 admin）
    method: 'GET',
    path: '/api/v1/admin/test/coverage',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      // 纯函数编排：确定性模拟基线 → 覆盖率报告（含缺口识别）
      const report = generateCoverageReport({
        generatedAt: new Date().toISOString(),
      });

      return json(ok(report));
    },
    auth: true,
  },
];
