/**
 * 健澜科技 jlmedaios - M163-A 等保三级 安全合规（管理端）
 *
 * GET /api/v1/admin/security/compliance（仅 admin）
 *
 * 行为约定（生产就绪质量门禁）：
 *  - 不发起任何真实 HTTP / DB 请求；
 *  - 调用纯函数 buildSecurityComplianceReport() 汇总五大类 15 项等保三级控制；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403（依据宪法第三章）；
 *  - 返回结构与 web/src/pages/admin/SecurityCompliance/index.tsx 对齐。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { buildSecurityComplianceReport } from '../aggregators/securityComplianceAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

export const securityComplianceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/compliance',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const report = buildSecurityComplianceReport(new Date().toISOString());
      return json(ok(report));
    },
    auth: true,
  },
];
