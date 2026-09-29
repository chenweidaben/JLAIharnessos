/**
 * 健澜科技 jlmedaios - 手术麻醉 BFF 路由（M3-H）
 *
 * 真实落 PostgreSQL，去 mock：申请/排班/三方核对/麻醉/术中事件/PACU/双签/离室。
 * 权限码 + 统一错误信封 + traceId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  SurgeryError,
  submitRequest,
  listRequestsView,
  getSurgery,
  schedule,
  precheck,
  anesthesiaInduction,
  intraopEvent,
  stageTransition,
  pacuAssess,
  sign,
  discharge,
  cancel,
} from '../aggregators/surgeryAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof SurgeryError) {
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
  const message = err instanceof Error ? err.message : '手术麻醉处理失败';
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

export const surgeryRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/surgery/requests',
    handle: guarded('surgery:schedule', async (c, view) =>
      submitRequest(view, await c.body<Parameters<typeof submitRequest>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/surgery/requests',
    handle: guarded('surgery:view', () => listRequestsView()),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/surgery/request/:id',
    handle: guarded('surgery:view', (c) => getSurgery(c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/schedule/:id',
    handle: guarded('surgery:schedule', async (c, view) =>
      schedule(c.params.id, view, await c.body<Record<string, unknown>>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/precheck/:id',
    handle: guarded('surgery:precheck', async (c, view) =>
      precheck(c.params.id, view, ((await c.body<{ precheck?: Record<string, unknown> }>()).precheck ?? {})),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/induction/:id',
    handle: guarded('surgery:anesthesia', async (c, view) =>
      anesthesiaInduction(c.params.id, view, (await c.body<{ notes?: string }>()).notes ?? ''),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/event/:id',
    handle: guarded('surgery:anesthesia', async (c, view) =>
      intraopEvent(c.params.id, view, await c.body<{ eventType: string; payload: Record<string, unknown> }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/stage/:id',
    handle: guarded('surgery:anesthesia', async (c, view) => {
      const b = await c.body<{ to: 'maintenance' | 'recovery' | 'pacu'; notes?: string }>();
      return stageTransition(c.params.id, b.to, view, b.notes);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/pacu/:id',
    handle: guarded('surgery:discharge', async (c, view) =>
      pacuAssess(c.params.id, view, await c.body<{ aldrete: number; note?: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/sign/:id',
    handle: guarded('surgery:discharge', async (c, view) =>
      sign(c.params.id, view, (await c.body<{ role: 'surgeon' | 'anesthetist' }>()).role),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/discharge/:id',
    handle: guarded('surgery:discharge', (c, view) => discharge(c.params.id, view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/cancel/:id',
    handle: guarded('surgery:schedule', async (c, view) =>
      cancel(c.params.id, view, (await c.body<{ reason?: string }>()).reason ?? ''),
    ),
    auth: true,
  },
];
