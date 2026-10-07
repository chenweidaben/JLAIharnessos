/**
 * 健澜科技 jlmedaios - 输血管理 BFF 路由（M10-A）
 *
 * 真实落 PostgreSQL，去 mock：申请/交叉配血/发血扣库/双人核对输注/完成/停输/
 * 不良反应上报。权限码 + 统一错误信封 + traceId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  TransfusionError,
  applyTransfusion,
  listTransfusionsView,
  getTransfusion,
  crossmatch,
  dispense,
  startTransfusion,
  completeTransfusion,
  stopTransfusion,
  cancelRequest,
  reportReaction,
} from '../aggregators/transfusionAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof TransfusionError) {
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
  const message = err instanceof Error ? err.message : '输血管理处理失败';
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

export const transfusionRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/transfusions',
    handle: guarded('blood:apply', async (c, view) =>
      applyTransfusion(view, await c.body<Parameters<typeof applyTransfusion>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/transfusions',
    handle: guarded('blood:apply', () => listTransfusionsView()),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/transfusions/:id',
    handle: guarded('blood:apply', (c) => getTransfusion(c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/transfusions/:id/crossmatch',
    handle: guarded('blood:crossmatch', async (c, view) =>
      crossmatch(c.params.id, view, await c.body<{ result: string; note?: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/transfusions/:id/dispense',
    handle: guarded('blood:dispense', async (c, view) =>
      dispense(c.params.id, view, await c.body<{ batchNo?: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/transfusions/:id/start',
    handle: guarded('blood:transfuse', async (c, view) =>
      startTransfusion(c.params.id, view, await c.body<{ coSignBy: string; dripRate?: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/transfusions/:id/complete',
    handle: guarded('blood:transfuse', async (c, view) =>
      completeTransfusion(c.params.id, view, await c.body<{ vitalSigns?: Record<string, unknown> }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/transfusions/:id/stop',
    handle: guarded('blood:transfuse', async (c, view) =>
      stopTransfusion(c.params.id, view, await c.body<{ reason: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/transfusions/:id/cancel',
    handle: guarded('blood:apply', async (c, view) =>
      cancelRequest(c.params.id, view, await c.body<{ reason: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/transfusions/:id/reaction',
    handle: guarded('blood:review', async (c, view) =>
      reportReaction(c.params.id, view, await c.body<{
        severity: string;
        symptom: string;
        action: string;
        outcome?: string;
      }>()),
    ),
    auth: true,
  },
];
