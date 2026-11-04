/**
 * 健澜AI原生医院操作系统OS - P0-1 门诊挂号交易闭环路由
 *
 * 路径前缀 /api/v1/outpatient/register-trade（避开既有 outpatientRegister.ts 的 GET 路径）。
 * 全部 auth:true；金额整数分；状态机非法跃迁 409。
 *
 * 权限说明：当前权限码体系尚未单设 opd:register:write 等细粒度码；
 * 本聚合器按"已登录医护且权限集合非空"放行（与 order.ts 同层），
 * TODO-prod: 补 opd:register / opd:cancel:approve 专用码并接入 role_permissions 种子。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  OutpatientRegisterTradeError,
  reserveSlot,
  releaseSlot,
  register,
  requestCancel,
  approveCancel,
  transition,
  listQueue,
  listRegistrations,
} from '../aggregators/outpatientRegisterTradeAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof OutpatientRegisterTradeError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

/** 门诊窗口/分诊台/收费员共用交易：要求已登录且权限集合非空（即真实医护账号）。 */
function assertStaff(view: AuthView): void {
  if (!view.permissions || view.permissions.length === 0) {
    throw new OutpatientRegisterTradeError(403, '无门诊挂号交易权限');
  }
}

export const outpatientRegisterTradeRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/outpatient/register-trade/slots/:slotId/reserve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reserveSlot({
          slotId: c.params.slotId,
          patientId: String(b.patientId ?? ''),
          patientName: String(b.patientName ?? ''),
          ttlSeconds: typeof b.ttlSeconds === 'number' ? b.ttlSeconds : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/outpatient/register-trade/slots/release',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(releaseSlot(String(b.reservationId ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/outpatient/register-trade/registrations',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(register({
          reservationId: String(b.reservationId ?? ''),
          feeCents: typeof b.feeCents === 'number' ? b.feeCents : Number.NaN,
          paymentMethod: b.paymentMethod ? String(b.paymentMethod) : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/outpatient/register-trade/registrations',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listRegistrations()));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/outpatient/register-trade/registrations/:regNo/cancel-request',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(requestCancel({
          regNo: c.params.regNo,
          reason: String(b.reason ?? ''),
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/outpatient/register-trade/registrations/:regNo/cancel-approve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(approveCancel({
          regNo: c.params.regNo,
          approved: Boolean(b.approved),
          approverNote: b.approverNote ? String(b.approverNote) : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/outpatient/register-trade/registrations/:regNo/transition',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(transition({
          regNo: c.params.regNo,
          action: String(b.action ?? ''),
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/outpatient/register-trade/queue',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listQueue()));
      } catch (e) { return mapError(e); }
    },
  },
];
