/**
 * 健澜科技 jlmedaios - 科室知识沉淀引擎路由（M101-A）
 * GET /api/v1/dept/:code/knowledge?type=pathway
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { DeptKnowledgeError, getDeptKnowledge } from '../aggregators/deptKnowledgeAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DeptKnowledgeError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '科室知识查询失败'), 500);
}

/** 权限守卫：dept_knowledge:view */
function guarded(perm: string, fn: (c: Ctx, view: AuthView) => Promise<unknown>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (e) {
      return mapError(e);
    }
  };
}

export const deptKnowledgeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/dept/:code/knowledge',
    auth: true,
    handle: guarded('dept_knowledge:view', async (c, view) =>
      getDeptKnowledge(view, c.params.code ?? '', c.query.get('type') ?? undefined),
    ),
  },
];
