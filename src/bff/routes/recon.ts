/**
 * 健澜科技 jlmedaios - 医保对账 BFF 路由（M3-G）
 *
 * 真实落 PostgreSQL，去 mock：对账队列 / 明细（recon:view）；
 * 重算、确认、挂起（recon:confirm）。统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  ReconError,
  runReconciliation,
  listRunSummaries,
  getRunDetail,
  confirmRun,
  disputeRun,
} from '../aggregators/reconAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ReconError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 400
            ? ErrorCode.BAD_REQUEST
            : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '对账处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      return json(ok(data));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const reconRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/recon/run',
    handle: guarded('recon:confirm', (c, view) => runReconciliation(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/recon/runs',
    handle: guarded('recon:view', () => listRunSummaries()),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/recon/run/:id',
    handle: guarded('recon:view', (c) => getRunDetail(c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/recon/confirm/:id',
    handle: guarded('recon:confirm', (c, view) => confirmRun(c.params.id, view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/recon/dispute/:id',
    handle: guarded('recon:confirm', async (c, view) =>
      disputeRun(c.params.id, view, (await c.body<{ note?: string }>()).note ?? ''),
    ),
    auth: true,
  },
];
