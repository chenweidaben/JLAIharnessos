/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引 BFF 路由（M5-C）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 候选/链接/标识查看（empi:read）；
 *  - 标识登记、扫描匹配、候选确认/拒绝（empi:write）。
 *
 * 每个写操作校验权限码；统一错误信封；关键操作写审计哈希链。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  EmpiAggregatorError,
  confirmMatchCandidate,
  getPatientIdentifiers,
  listEmpiLinks,
  listMatchCandidates,
  rejectMatchCandidate,
  registerPatientIdentifier,
  runEmpiScan,
} from '../aggregators/empiAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof EmpiAggregatorError) {
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
  const message = err instanceof Error ? err.message : 'EMPI 处理失败';
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

export const empiRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/empi/candidates',
    handle: guarded('empi:read', (c, view) =>
      listMatchCandidates(view, {
        status: c.query.get('status') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/empi/links',
    handle: guarded('empi:read', (c, view) => listEmpiLinks(view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/empi/scan',
    handle: guarded('empi:write', (c, view) => runEmpiScan(view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/empi/identifiers',
    handle: guarded('empi:write', async (c, view) =>
      registerPatientIdentifier(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/empi/patients/:id/identifiers',
    handle: guarded('empi:read', (c, view) =>
      getPatientIdentifiers(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/empi/candidates/:id/confirm',
    handle: guarded('empi:write', (c, view) =>
      confirmMatchCandidate(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/empi/candidates/:id/reject',
    handle: guarded('empi:write', (c, view) =>
      rejectMatchCandidate(view, c.params.id),
    ),
    auth: true,
  },
];
