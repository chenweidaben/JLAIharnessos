/**
 * 健澜科技 jlmedaios - 200 版本质量门禁报告 BFF 路由（M157-C · 200版本里程碑）
 *
 * GET /api/v1/admin/quality-gate
 *  - auth: true + requirePermissionCode('system:quality:gate:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回六项门禁复查结果（fullQualityGate）+ 执行报告（generateQualityGateReport）；
 *  - 数据来自纯函数聚合器，不落库、不读文件系统 / DB、不含 PII、不写 SQL。
 *
 * 生产安全加固：
 *  - 仅 GET，无任何状态变更副作用；
 *  - 采集失败时返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  fullQualityGate,
  generateQualityGateReport,
} from '../aggregators/qualityGateAggregator';

export const qualityGateRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/quality-gate',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 system:quality:gate:view
      const denied = requirePermissionCode(c, 'system:quality:gate:view');
      if (denied) return denied;
      try {
        // 200版本里程碑：纯函数产出，无 IO、无 PII、无 SQL
        const gate = fullQualityGate();
        const report = generateQualityGateReport();
        return json(ok({ gate, report }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '质量门禁数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
