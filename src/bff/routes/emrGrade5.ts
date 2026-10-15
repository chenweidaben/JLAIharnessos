/**
 * 健澜科技 jlmedaios - 电子病历五级评审八维度闭环自评路由（M99-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  EmrGrade5Error, listView, submitView, type Grade5DimensionInput,
} from '../aggregators/emrGrade5Aggregator.js';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 返回演示基线、POST 直接回 ok。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof EmrGrade5Error) {
    return json(fail(err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const emrGrade5Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emr/grade5',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true }));
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await listView(view)));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/emr/grade5',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, message: '演示模式：自评结果未落库' }));
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = (await c.body()) as { dimensions?: Grade5DimensionInput[] };
        return json(ok(await submitView(view, { dimensions: body.dimensions ?? [] })));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
