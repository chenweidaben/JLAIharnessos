/**
 * 健澜科技 jlmedaios - 300 版本质量门禁报告 V2 BFF 路由（M181-C · 300版本里程碑）
 *
 * GET /api/v1/admin/quality-gate/v2
 *  - auth: true + requirePermissionCode('system:quality:gate:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回八项门禁复查结果（fullQualityGateV2）+ 执行报告（generateQualityGateReportV2）；
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
  fullQualityGateV2,
  generateQualityGateReportV2,
} from '../aggregators/qualityGateV2Aggregator';

export const qualityGateV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/quality-gate/v2',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 system:quality:gate:view
      const denied = requirePermissionCode(c, 'system:quality:gate:view');
      if (denied) return denied;
      try {
        // 300版本里程碑：纯函数产出，无 IO、无 PII、无 SQL
        const gate = fullQualityGateV2();
        const report = generateQualityGateReportV2();
        return json(ok({ gate, report }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '质量门禁 V2 数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
