/**
 * 健澜科技 jlmedaios - 家属代办授权 BFF 路由（M3-Q）
 *
 * 患者端（patient JWT）：授予/更新/撤销/查看就诊人代办授权。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../types';
import { requireRole } from '../middleware/auth';
import {
  DelegationError,
  grantDelegation,
  revokeDelegation,
  listDelegations,
} from '../aggregators/patientDelegationAggregator';

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof DelegationError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 400
            ? ErrorCode.BAD_REQUEST
            : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message, c.traceId), err.status);
  }
  console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(
    fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
    500,
  );
}

/** 患者端守卫：patient JWT，返回 accountId。 */
function patientOnly(c: Ctx): string | Response {
  const denied = requireRole(c, 'patient');
  if (denied) return denied;
  return c.user!.id;
}

export const delegationRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/delegation/grant',
    auth: true,
    handle: async (c) => {
      const accountId = patientOnly(c);
      if (accountId instanceof Response) return accountId;
      try {
        const body = await c.body<{
          profileId: string;
          scopes: string[];
          note?: string;
          confirmHighRisk?: boolean;
        }>();
        return json(
          ok(
            await grantDelegation(accountId, {
              profileId: body.profileId,
              scopes: body.scopes,
              note: body.note,
              confirmHighRisk: body.confirmHighRisk,
            }),
          ),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/delegation/revoke',
    auth: true,
    handle: async (c) => {
      const accountId = patientOnly(c);
      if (accountId instanceof Response) return accountId;
      try {
        const body = await c.body<{ profileId: string; note?: string }>();
        return json(
          ok(await revokeDelegation(accountId, { profileId: body.profileId, note: body.note })),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/delegation/:profileId/history',
    auth: true,
    handle: async (c) => {
      const accountId = patientOnly(c);
      if (accountId instanceof Response) return accountId;
      try {
        return json(
          ok(
            await listDelegations(accountId, { profileId: c.params.profileId }),
          ),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
