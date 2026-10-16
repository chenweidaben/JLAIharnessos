/**
 * 健澜科技 jlmedaios - M174-A 医院数据安全深化 · 等保三级复查（管理端）
 *
 * GET /api/v1/admin/security/recheck（仅 admin）
 *
 * 行为约定（生产就绪质量门禁）：
 *  - 不发起任何真实 HTTP / DB 请求；
 *  - 调用纯函数 recheckSecurityCompliance() 产出复查报告，
 *    同时附带 trackSecurityFixes() 与 generateSecurityTrend() 结果，供前端一屏展示；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403（依据宪法第三章）；
 *  - 返回结构与 web/src/pages/admin/SecurityRecheck/index.tsx 对齐。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  generateSecurityTrend,
  recheckSecurityCompliance,
  trackSecurityFixes,
  type TrendPeriod,
} from '../aggregators/securityRecheckAggregator';
import { buildSecurityComplianceReport } from '../aggregators/securityComplianceAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/**
 * 解析 period 查询参数（30d/90d/180d），默认 90d。
 */
function parsePeriod(raw: string | undefined): TrendPeriod {
  if (raw === '30d' || raw === '180d') return raw;
  return '90d';
}

export const securityRecheckRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/recheck',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const period = parsePeriod(c.query.get('period') ?? undefined);

      // 本轮复查报告
      const recheck = recheckSecurityCompliance();
      // 上一轮基线（M163）用于 diff
      const baseline = buildSecurityComplianceReport(recheck.baselineAt);
      // 修复跟踪：基线 → 本轮
      const tracking = trackSecurityFixes(baseline, recheck);
      // 安全趋势
      const trend = generateSecurityTrend(period);

      return json(ok({ recheck, tracking, trend }));
    },
    auth: true,
  },
];
