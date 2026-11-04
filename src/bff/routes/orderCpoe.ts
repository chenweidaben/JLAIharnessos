/**
 * 健澜AI原生医院操作系统OS - P0-2 医嘱 CPOE 交易路由
 *
 * 医嘱开立 → 护士/药师审核 → 执行确认 → 停止/撤销 闭环的写端与查询端：
 *  - POST /api/v1/orders/:id/review          护士/药师审核（approve/reject，重复审核 409）
 *  - POST /api/v1/orders/sets                成套医嘱批量开立（整批原子，任一非法零落库）
 *  - POST /api/v1/orders/:id/stop            停止（approved/executed → stopped）
 *  - POST /api/v1/orders/:id/execution-slip  执行单生成（同批幂等返回 reused=true）
 *  - GET  /api/v1/orders/cpoe                医嘱列表（?visitId= 过滤）
 *  - GET  /api/v1/orders/cpoe/slips          执行单列表
 *
 * 权限分级：开立/停止/成套=医生，审核=护士长/药师，执行单=护士；越权 403 且响应体带 code。
 * 权限判定读验签 JWT 注入的 c.user.roles / c.user.permissions（不是 requester 的 AuthView）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  OrderCpoeError,
  assertCan,
  reviewOrder,
  createOrderSet,
  stopOrder,
  buildExecutionSlip,
  listOrders,
  listSlips,
} from '../aggregators/orderCpoeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof OrderCpoeError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

/** 从验签身份提取角色/权限（DEMO 无 token 时 requireAuth 已注入 demo admin）。 */
function actor(c: Ctx): { roles: string[]; permissions: string[] } {
  return {
    roles: c.user?.roles ?? [],
    permissions: c.user?.permissions ?? [],
  };
}

export const orderCpoeRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/orders/:id/review',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        assertCan(actor(c), 'review');
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reviewOrder({
          orderId: c.params.id,
          decision: String(b.decision ?? ''),
          comment: b.comment ? String(b.comment) : undefined,
          reviewerId: c.user!.id,
          reviewerName: c.user!.name,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/orders/sets',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        assertCan(actor(c), 'write');
        const b = (await c.body()) as Record<string, unknown>;
        const rawOrders = Array.isArray(b.orders) ? b.orders as Array<Record<string, unknown>> : [];
        return json(ok(createOrderSet({
          visitId: String(b.visitId ?? ''),
          patientId: b.patientId ? String(b.patientId) : undefined,
          setName: String(b.setName ?? ''),
          orders: rawOrders.map((it) => ({
            orderType: String(it.orderType ?? ''),
            content: String(it.content ?? ''),
            dosage: it.dosage ? String(it.dosage) : undefined,
            frequency: it.frequency ? String(it.frequency) : undefined,
            route: it.route ? String(it.route) : undefined,
            feeCents: typeof it.feeCents === 'number' ? it.feeCents : NaN,
          })),
          orderedBy: c.user!.id,
          orderedByName: c.user!.name,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/stop',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        assertCan(actor(c), 'write');
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(stopOrder({
          orderId: c.params.id,
          reason: String(b.reason ?? ''),
          stoppedBy: c.user!.id,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/execution-slip',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        assertCan(actor(c), 'execute');
        const b = (await c.body()) as Record<string, unknown>;
        const bodyIds = Array.isArray(b.orderIds) ? (b.orderIds as unknown[]).map(String) : [];
        // 单条时省略 orderIds → 默认用路径 :id
        const orderIds = bodyIds.length > 0 ? bodyIds : [c.params.id];
        return json(ok(buildExecutionSlip({ orderIds, generatedBy: c.user!.id })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/orders/cpoe',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = c.query.get('visitId') ?? undefined;
        return json(ok(listOrders({ visitId })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/orders/cpoe/slips',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(listSlips()));
      } catch (e) { return mapError(e); }
    },
  },
];
