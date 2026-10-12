/**
 * 健澜科技 jlmedaios - 临床改进任务路由（M22-D）
 * /api/v1/improvement-tasks
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  createFromAttributionView,
  ImprovementError,
  listBySourceView,
  listMineView,
  transitionView,
} from '../aggregators/improvementTaskAggregator';
import { getChain } from '../../db/repositories/escalationRepo.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ImprovementError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : err.status === 409 ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '改进任务失败'), 500);
}

function guarded<T>(perm: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try { return json(ok(await fn(c, view))); } catch (err) { return mapError(err); }
  };
}

export const improvementTaskRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/improvement-tasks/from-attribution',
    handle: guarded('improvement_task:assign', async (c, view) => createFromAttributionView(view, await c.body<Parameters<typeof createFromAttributionView>[1]>())), auth: true },
  { method: 'GET', path: '/api/v1/improvement-tasks/mine',
    handle: guarded('improvement_task:handle', (c, view) => listMineView(view)), auth: true },
  { method: 'GET', path: '/api/v1/improvement-tasks',
    handle: guarded('improvement_task:assign', (c, view) => listBySourceView(view, c.query.get('source') ?? 'drg_attribution')), auth: true },
  { method: 'GET', path: '/api/v1/improvement-tasks/:id/chain',
    handle: guarded('improvement_task:handle', (c, view) => getChain(c.params.id)), auth: true },
  { method: 'POST', path: '/api/v1/improvement-tasks/:id/transition',
    handle: guarded('improvement_task:handle', async (c, view) => transitionView(view, c.params.id, (await c.body<{ to: any }>()).to, (await c.body<{ resolutionNote?: string }>()).resolutionNote)), auth: true },
];
