import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { OrderError } from '../aggregators/orderAggregator.js';
import {
  OrderCpoeError,
  assertCan,
  createOrder,
  cancelOrder,
  executeOrder,
  listOrders,
  listExecutions,
} from '../aggregators/orderCpoeAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 医嘱动作的权限判定读验签 JWT 的 c.user.roles/permissions（DEMO 无 token 时为 demo admin）。 */
function actor(c: Ctx): { roles: string[]; permissions: string[] } {
  return { roles: c.user?.roles ?? [], permissions: c.user?.permissions ?? [] };
}

function mapError(err: unknown): Response {
  if (err instanceof OrderCpoeError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : err.status === 400 ? ErrorCode.BAD_REQUEST
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  if (err instanceof OrderError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : err.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const orderRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/orders', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // P0-2：移除 DEMO 空桩，改为 CPOE 内存台账真实数据（?visitId= 过滤）
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(listOrders({ visitId: c.query.get('visitId') ?? undefined }))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/orders', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertCan(actor(c), 'write');
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createOrder({
          visitId: String(b.visitId ?? ''),
          orderType: String(b.orderType ?? 'other'),
          content: String(b.content ?? ''),
          dosage: b.dosage ? String(b.dosage) : undefined,
          frequency: b.frequency ? String(b.frequency) : undefined,
          route: b.route ? String(b.route) : undefined,
          feeCents: typeof b.feeCents === 'number' ? b.feeCents : 0,
          orderedBy: c.user!.id,
          orderedByName: c.user!.name,
        })));
      } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/orders/:id/cancel', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertCan(actor(c), 'write');
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(cancelOrder({
          orderId: c.params.id,
          reason: String(b.reason ?? ''),
          cancelledBy: c.user!.id,
        })));
      } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/orders/:id/execute', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertCan(actor(c), 'execute');
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(executeOrder({
          orderId: c.params.id,
          executedBy: c.user!.id,
          executedByName: c.user!.name,
          note: b.note ? String(b.note) : undefined,
        })));
      } catch (e) { return mapError(e); }
    } },
  { method: 'GET', path: '/api/v1/orders/:id/executions', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // P0-2：移除 DEMO 空桩，返回该医嘱执行确认时追加的真实留痕数组（数据源=executeOrder）
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(listExecutions(c.params.id))); } catch (e) { return mapError(e); }
    } },
];
