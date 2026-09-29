/**
 * 健澜科技 jlmedaios - DRG 分组 BFF 路由（M3-D）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 规则目录 / 结果队列 / 详情（drg:view）；
 *  - 对出院就诊运行分组、确认、退回（drg:group）。
 *
 * 每个写操作校验权限码 + DataScope；统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listDrgRules } from '../../db/repositories/drgRepo';
import {
  DrgError,
  confirmResult,
  getResult,
  groupVisit,
  listResults,
  rejectResult,
} from '../aggregators/drgAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DrgError) {
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
  const message = err instanceof Error ? err.message : 'DRG 分组处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
  render: (data: T) => Response = (d) => json(ok(d)),
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      if (data instanceof Response) return data;
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

export const drgRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/drg/rules',
    handle: guarded('drg:view', async (_c, _view) => ({ rules: await listDrgRules() })),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/drg/results',
    handle: guarded('drg:view', async (c, view) => {
      const statusParam = new URL(c.req.url).searchParams.get('status');
      const status =
        statusParam === 'grouped' || statusParam === 'confirmed' || statusParam === 'rejected'
          ? statusParam
          : null;
      return { results: await listResults(view, status) };
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/drg/group/:visitId',
    handle: guarded('drg:group', (c, view) => groupVisit(c.params.visitId, view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/drg/result/:visitId',
    handle: guarded('drg:view', (c, view) => getResult(c.params.visitId, view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/drg/confirm/:id',
    handle: guarded('drg:group', (c, view) => confirmResult(c.params.id, view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/drg/reject/:id',
    handle: guarded('drg:group', async (c, view) =>
      rejectResult(c.params.id, view, (await c.body<{ reason?: string }>()).reason ?? ''),
    ),
    auth: true,
  },
];
