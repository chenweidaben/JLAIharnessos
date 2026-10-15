/**
 * 健澜科技 jlmedaios - 代码质量报告 BFF 路由（M150-B · 持续优化）
 *
 * GET /api/v1/admin/code/quality
 *  - auth: true + requirePermissionCode('system:code:quality:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回质量扫描结果（scanCodeQuality）+ 执行报告（generateQualityReport）；
 *  - 数据来自纯函数聚合器，不落库、不读文件系统、不含源码片段 / PII。
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
  generateQualityReport,
  scanCodeQuality,
} from '../aggregators/codeQualityAggregator';

export const codeQualityRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/code/quality',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 system:code:quality:view
      const denied = requirePermissionCode(c, 'system:code:quality:view');
      if (denied) return denied;
      try {
        // 持续优化：纯函数产出，无 IO、无 PII
        const scan = scanCodeQuality();
        const report = generateQualityReport();
        return json(ok({ scan, report }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '代码质量数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
