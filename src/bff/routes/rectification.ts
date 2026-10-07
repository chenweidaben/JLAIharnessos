/**
 * 健澜科技 jlmedaios - 缺陷整改闭环 BFF 路由（M9-B）
 *
 * 终末质控"缺陷级"整改：
 *  - POST /rectifications：质控人下发整改（quality:review）；
 *  - GET  /rectifications：列表（质控人看全部，责任医生看自己）；
 *  - GET  /rectifications/stats：统计；
 *  - GET  /rectifications/:id：详情（质控人或 assignee）；
 *  - POST /rectifications/:id/rectify：责任医生提交整改（quality:rectify）；
 *  - POST /rectifications/:id/review：质控人复核（quality:review）。
 *
 * 统一错误信封；业务变更与审计哈希链在同一事务提交。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  RectificationError,
  getRectificationDetail,
  getRectificationList,
  getRectificationStatsView,
  issueRectification,
  reviewRectification,
  submitRectification,
} from '../aggregators/rectificationAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof RectificationError) {
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
  const message = err instanceof Error ? err.message : '缺陷整改处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

/** 仅要求登录（角色/数据范围由聚合器按身份处理）。 */
function authOnly<T>(
  fn: (c: Ctx, view: AuthView) => Promise<T>,
  render: (data: T) => Response = (d) => json(ok(d)),
) {
  return async (c: Ctx): Promise<Response> => {
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

/** 要求指定权限码 + 登录。 */
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
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

export const rectificationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/rectifications/stats',
    handle: authOnly((_c, view) => getRectificationStatsView(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/rectifications',
    handle: authOnly(async (c, view) => {
      const q = c.query;
      return getRectificationList(view, {
        assigneeId: q.get('assigneeId'),
        status: (q.get('status') as never) ?? null,
        overdue: q.get('overdue') === 'true',
      });
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/rectifications',
    handle: guarded('quality:review', async (c, view) =>
      issueRectification(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/rectifications/:id',
    handle: authOnly((c, view) => getRectificationDetail(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/rectifications/:id/rectify',
    handle: guarded('quality:rectify', async (c, view) =>
      submitRectification(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/rectifications/:id/review',
    handle: guarded('quality:review', async (c, view) =>
      reviewRectification(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
];
