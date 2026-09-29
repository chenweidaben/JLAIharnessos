/**
 * 健澜科技 jlmedaios - 危急值闭环 BFF 路由（M3-F）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 扫描上报 / 队列（critical:view）；
 *  - 医师签收、处置闭环（critical:ack / critical:resolve）。
 * 统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  CriticalError,
  scanCritical,
  listQueue,
  ackAlert,
  resolveAlert,
} from '../aggregators/criticalValueAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof CriticalError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '危急值处理失败';
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

export const criticalRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/critical/scan',
    handle: guarded('critical:view', () => scanCritical()),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/critical/alerts',
    handle: guarded('critical:view', async (c, view) => {
      const s = new URL(c.req.url).searchParams.get('status');
      const status =
        s === 'raised' || s === 'acked' || s === 'resolved' ? s : null;
      return { items: await listQueue(view, status) };
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/critical/ack/:id',
    handle: guarded('critical:ack', (c, view) => ackAlert(c.params.id, view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/critical/resolve/:id',
    handle: guarded('critical:resolve', async (c, view) =>
      resolveAlert(c.params.id, view, (await c.body<{ note?: string }>()).note ?? ''),
    ),
    auth: true,
  },
];
