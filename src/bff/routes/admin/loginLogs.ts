/**
 * 健澜科技 jlmedaios - 登录日志查询 BFF 路由（M8-C）
 *
 *  - GET  /api/v1/admin/login-logs                分页列表（关键字/结果/时间筛选）
 *  - GET  /api/v1/admin/login-logs/overview       概览统计
 *  - GET  /api/v1/admin/login-logs/trend          近 N 天趋势
 *  - POST /api/v1/admin/login-logs/force-logout   强制在线用户下线（session:manage）
 *
 * 查询端点需要 system:loginlog:view 权限；强制下线需要 session:manage 权限。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { z } from 'zod';

import { buildAuthView, type AuthView } from '../../view/userView';
import { requirePermissionCode } from '../../middleware/auth';
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../../types';
import {
  forceLogout,
  loginOverview,
  loginTrend,
  queryLoginLogs,
} from '../../aggregators/loginLogAggregator';

/** 从 Ctx 加载操作人视图 */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 解析正整数 query 参数 */
function intParam(c: Ctx, key: string, dflt: number): number {
  const v = Number(c.query.get(key));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : dflt;
}

const forceBody = z.object({ userId: z.string().uuid() });

export const loginLogRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/login-logs',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:loginlog:view');
      if (denied) return denied;
      const successParam = c.query.get('success');
      return json(
        ok(
          await queryLoginLogs({
            keyword: c.query.get('keyword') ?? undefined,
            success:
              successParam === 'true' ? true : successParam === 'false' ? false : undefined,
            startTime: c.query.get('startTime') ?? undefined,
            endTime: c.query.get('endTime') ?? undefined,
            page: intParam(c, 'page', 1),
            pageSize: intParam(c, 'pageSize', 20),
          }),
        ),
      );
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/login-logs/overview',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:loginlog:view');
      if (denied) return denied;
      return json(ok(await loginOverview()));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/login-logs/trend',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:loginlog:view');
      if (denied) return denied;
      return json(ok(await loginTrend(intParam(c, 'days', 7))));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/login-logs/force-logout',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'session:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = forceBody.parse(await c.body());
        const result = await forceLogout(view, body.userId);
        return json(ok(result, '已强制下线'));
      } catch (err) {
        if (err instanceof z.ZodError) {
          return json(fail(ErrorCode.BAD_REQUEST, '参数校验失败: userId 非法', c.traceId), 400);
        }
        const message = err instanceof Error ? err.message : '强制下线失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
    auth: true,
  },
];
