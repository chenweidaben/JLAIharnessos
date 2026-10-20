/**
 * 健澜科技 jlmedaios - 电子病历五级评审自评仪表盘路由（M90-A + M93-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { EmrLevel5Error, loadTrend } from '../aggregators/emrLevel5Aggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof EmrLevel5Error) return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const emrLevel5Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emr-level5/dashboard',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // v5.0试点扩展（M189 EMR/AI种子）：DEMO 仪表盘由聚合器 loadTrend 内部分支返回完整字段
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await loadTrend(view)));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
