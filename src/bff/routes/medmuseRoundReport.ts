/**
 * MEDMUSE 晨间查房交班报告路由。
 *
 * 权限：medmuse:chat（临床角色均可触发生成与查看）。
 * POST generate 为只读聚合写报告表，不修改临床数据，故不强制 Idempotency-Key。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  generateRoundReport,
  listRoundReports,
} from '../agents/roundReportService';

function mapError(err: unknown, c: Ctx): Response {
  console.error(`[medmuse-round-report error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId), 500);
}

export const medmuseRoundReportRoutes: RouteDef[] = [
  // ----- 生成当日交班报告 -----
  {
    method: 'POST',
    path: '/api/v1/medmuse/round-reports/generate',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      if (!c.user) {
        return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      }
      try {
        const report = await generateRoundReport(c.user.id);
        return json(ok(report));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 查询交班报告历史（可选 ?date=YYYY-MM-DD） -----
  {
    method: 'GET',
    path: '/api/v1/medmuse/round-reports',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      if (!c.user) {
        return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      }
      try {
        const url = new URL(c.req.url);
        const date = url.searchParams.get('date') ?? undefined;
        const reports = await listRoundReports(c.user.id, date);
        return json(ok(reports));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
