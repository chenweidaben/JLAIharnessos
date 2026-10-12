/**
 * 健澜科技 jlmedaios - 不良事件后结构化评估 BFF 路由（M17-D）
 *
 * /api/v1/nursing-event-reviews。权限码 + 统一错误信封 + traceId。集合/静态路由在 :id 之前。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  createReviewView,
  EventReviewError,
  getEventMetrics,
  listEventsView,
  listReviewsView,
  recordEventView,
} from '../aggregators/nursingEventReviewAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof EventReviewError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 409 ? ErrorCode.CONFLICT
          : err.status === 403 ? ErrorCode.FORBIDDEN
            : err.status === 400 ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '不良事件评估处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(permission: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const nursingEventReviewRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nursing-event-reviews/metrics',
    handle: guarded('event_review:read', (_c, view) => getEventMetrics(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nursing-event-reviews/events',
    handle: guarded('event_review:read', (c, view) =>
      listEventsView(view, c.query.get('visitId') ?? undefined),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/nursing-event-reviews/events',
    handle: guarded('event_review:write', async (c, view) =>
      recordEventView(view, await c.body<Parameters<typeof recordEventView>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nursing-event-reviews',
    handle: guarded('event_review:read', (c, view) =>
      listReviewsView(view, c.query.get('visitId') ?? undefined),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/nursing-event-reviews',
    handle: guarded('event_review:write', async (c, view) =>
      createReviewView(view, await c.body<Omit<Parameters<typeof createReviewView>[1], 'reviewedBy'>>()),
    ),
    auth: true,
  },
];
