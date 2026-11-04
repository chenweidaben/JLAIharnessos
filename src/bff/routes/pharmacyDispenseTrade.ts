/**
 * 健澜AI原生医院操作系统OS - P0-4 药房发药交易路由
 *
 * 路径前缀 /api/v1/pharmacy/dispense-trade（避开既有 pharmacyDispense.ts 的
 * returns/consultations/narcotics/stock-counts/formulary，以及 M86-H
 * pharmacyDispenseConfirm.ts 的 dispense/pending|confirm|return 路径）。
 * 全部 auth:true；状态机非法跃迁 409；金额整数分。
 *
 * 权限说明：本聚合器按"已登录药师且权限集合非空"放行（与 P0-1/P0-3 同层），
 * TODO-prod: 在各写路由内分别校验 view.permissions 包含
 * pharmacy:prepack:create / pharmacy:prepack:complete / pharmacy:dispense:confirm /
 * pharmacy:return:approve 等细粒度码并接入 role_permissions 种子。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  PharmacyDispenseTradeError,
  createPrepackBatch,
  completePrepacking,
  confirmDispense,
  requestReturn,
  approveReturn,
  listPrepackBatches,
  listDispenses,
  listReturnRequests,
} from '../aggregators/pharmacyDispenseTradeAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PharmacyDispenseTradeError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

/** 药房交易：要求已登录且权限集合非空（即真实药师账号）。 */
function assertStaff(view: AuthView): void {
  if (!view.permissions || view.permissions.length === 0) {
    throw new PharmacyDispenseTradeError(403, '无药房发药交易权限');
  }
}

export const pharmacyDispenseTradeRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/pharmacy/dispense-trade/prepack-batches',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createPrepackBatch({
          deptCode: String(b.deptCode ?? ''),
          period: String(b.period ?? ''),
          orderIds: Array.isArray(b.orderIds) ? b.orderIds.map(String) : [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/dispense-trade/prepack-batches',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listPrepackBatches()));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/pharmacy/dispense-trade/prepack-batches/:batchNo/complete',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(completePrepacking({ batchNo: c.params.batchNo })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/pharmacy/dispense-trade/dispenses',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(confirmDispense({
          orderId: String(b.orderId ?? ''),
          batchNo: String(b.batchNo ?? ''),
          dispenserId: String(b.dispenserId ?? ''),
          checkerId: String(b.checkerId ?? ''),
          signedAt: typeof b.signedAt === 'number' ? b.signedAt : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/dispense-trade/dispenses',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listDispenses()));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/pharmacy/dispense-trade/returns',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(requestReturn({
          dispenseNo: String(b.dispenseNo ?? ''),
          reason: String(b.reason ?? ''),
          quantity: typeof b.quantity === 'number' ? b.quantity : NaN,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/pharmacy/dispense-trade/returns/:dispenseNo/approve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(approveReturn({
          dispenseNo: c.params.dispenseNo,
          approved: Boolean(b.approved),
          approverId: view.id,
          note: b.note ? String(b.note) : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/dispense-trade/returns',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listReturnRequests()));
      } catch (e) { return mapError(e); }
    },
  },
];
