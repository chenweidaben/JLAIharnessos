/**
 * 健澜科技 jlmedaios - 医院统计上报路由（M177-B）
 *
 * 统计上报要国家口径，不能凑数：POST /api/v1/admin/stat/submit
 * 按 reportType 走国家口径 schema 校验，不过即 422 拒绝。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  buildDeepStatReport,
  collectStatData,
  StatReportError,
  submitStatReport,
  type ReportType,
  type StatData,
} from '../aggregators/statReportAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof StatReportError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '统计上报失败'), 500);
}

function guarded<T>(perm: string, fn: (c: Ctx, view: AuthView) => Promise<T> | T) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try { return json(ok(await fn(c, view))); } catch (err) { return mapError(err); }
  };
}

interface SubmitBody {
  reportType?: ReportType;
  period?: string;
  data?: StatData;
}

export const statReportRoutes: RouteDef[] = [
  {
    method: 'GET', path: '/api/v1/admin/stat/system',
    handle: guarded('stat_report:view', () => buildDeepStatReport()), auth: true,
  },
  {
    method: 'GET', path: '/api/v1/admin/stat/collect',
    handle: guarded('stat_report:view', (c) => {
      const reportType = (c.query.get('reportType') ?? '') as ReportType;
      const period = c.query.get('period') ?? '';
      return collectStatData(reportType, period);
    }), auth: true,
  },
  {
    method: 'POST', path: '/api/v1/admin/stat/submit',
    handle: guarded('stat_report:submit', async (c) => {
      const body = await c.body<SubmitBody>();
      if (!body.reportType) throw new StatReportError(400, 'BAD_REQUEST', '缺少 reportType');
      if (!body.period) throw new StatReportError(400, 'BAD_REQUEST', '缺少 period');
      const data = (body.data ?? {}) as StatData;
      return submitStatReport(body.reportType, body.period, data);
    }), auth: true,
  },
];
