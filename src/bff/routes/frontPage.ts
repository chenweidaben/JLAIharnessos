/**
 * 健澜科技 jlmedaios - 病案首页 BFF 路由（M3-A）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 队列 / 详情（front_page:read）；
 *  - 出院汇聚（front_page:code，幂等）；
 *  - 编码员保存编码（front_page:code）；
 *  - 第二人质控通过/退回（front_page:audit，职责分离在聚合器强制）；
 *  - 归档（front_page:audit）。
 *
 * 每个写操作校验权限码 + DataScope；统一错误信封；
 * 业务变更与审计哈希链在同一事务提交。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  FrontPageError,
  aggregateFrontPage,
  archiveFrontPage,
  getFrontPageDetail,
  getFrontPageQueue,
  saveCoding,
  submitReview,
} from '../aggregators/frontPageAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof FrontPageError) {
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
  const message = err instanceof Error ? err.message : '病案首页处理失败';
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

export const frontPageRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/front-pages/queue',
    handle: guarded('front_page:read', (_c, view) => getFrontPageQueue(view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/front-pages/aggregate/:visitId',
    handle: guarded('front_page:code', (c, view) => aggregateFrontPage(view, c.params.visitId)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/front-pages/:id',
    handle: guarded('front_page:read', (c, view) => getFrontPageDetail(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/front-pages/:id/coding',
    handle: guarded('front_page:code', async (c, view) =>
      saveCoding(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/front-pages/:id/review',
    handle: guarded('front_page:audit', async (c, view) =>
      submitReview(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/front-pages/:id/archive',
    handle: guarded('front_page:audit', async (c, view) =>
      archiveFrontPage(view, c.params.id, Number((await c.body<{ version?: number }>()).version)),
    ),
    auth: true,
  },
];
