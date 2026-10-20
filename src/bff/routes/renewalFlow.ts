/**
 * 健澜科技 jlmedaios - 续方流转路由（M21-A）
 * /api/v1/renewal
 *
 * v5.0试点扩展（M185bug修复）：DEMO_MODE 下表未迁移时，pharmacy-tasks 列表降级为空数组，
 * 避免 500 被前端误判为 BFF 不可用。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { completeTaskView, dispenseView, listMineView, listPendingTasksView, payView, prescribeView, RenewalError } from '../aggregators/renewalFlowAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** v5.0试点扩展（M185bug修复）：演示库表缺失时降级为空列表响应 */
function demoEmptyList(): Response {
  return json(ok([]));
}

function mapError(err: unknown): Response {
  const msg = err instanceof Error ? err.message : String(err);
  // v5.0试点扩展（M185bug修复）：DEMO_MODE 下 relation/table 不存在属预期
  if (process.env.DEMO_MODE === '1' && /does not exist|relation|table|column/i.test(msg)) {
    return demoEmptyList();
  }
  if (err instanceof RenewalError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : err.status === 409 ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '续方流转失败'), 500);
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

export const renewalRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/renewal/mine',
    handle: guarded('renewal:pay', (c, view) => listMineView(view, c.query.get('patientId') ?? '')), auth: true },
  { method: 'POST', path: '/api/v1/renewal/sessions/:id/prescribe',
    handle: guarded('renewal:prescribe', async (c, view) => prescribeView(view, await c.body<Parameters<typeof prescribeView>[1]>())), auth: true },
  { method: 'POST', path: '/api/v1/renewal/:id/pay',
    handle: guarded('renewal:pay', (c, view) => payView(view, c.params.id)), auth: true },
  { method: 'POST', path: '/api/v1/renewal/:id/dispense',
    handle: guarded('renewal:prescribe', (c, view) => dispenseView(view, c.params.id)), auth: true },
  { method: 'GET', path: '/api/v1/pharmacy-tasks',
    handle: guarded('pharmacy:dispense', (c, view) => listPendingTasksView(view)), auth: true },
  { method: 'POST', path: '/api/v1/pharmacy-tasks/:id/complete',
    handle: guarded('pharmacy:dispense', (c, view) => completeTaskView(view, c.params.id)), auth: true },
];
