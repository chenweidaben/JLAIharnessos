/**
 * 健澜AI原生医院操作系统OS - P0-3 护士站交易路由
 *
 * 路径前缀 /api/v1/nurse-station（避开既有 nurseStation.ts 的 ward/visit/:visitId 路径，
 * 本片新路径为 /pending-review、/approved-orders、/executed-orders、/orders/:orderId/*）。
 * 全部 auth:true；状态机非法跃迁 409；金额整数分。
 *
 * 权限说明：当前权限码体系已定义 inpatient_order:review（医嘱审核）与
 * mobile_nursing:execute / inpatient_order:administer（PDA 床边执行）；
 * 本聚合器按"已登录医护且权限集合非空"放行（与 P0-1 outpatientRegisterTrade 同层），
 * TODO-prod: 在各写路由内分别校验 view.permissions 包含上述细粒度码并接入 role_permissions 种子。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  NurseStationTradeError,
  reviewOrder,
  executeAtBedside,
  buildExecutionSlip,
  listPendingReview,
  listApproved,
  listExecuted,
} from '../aggregators/nurseStationTradeAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof NurseStationTradeError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

/** 护士站交易：要求已登录且权限集合非空（即真实医护账号）。 */
function assertStaff(view: AuthView): void {
  if (!view.permissions || view.permissions.length === 0) {
    throw new NurseStationTradeError(403, '无护士站交易权限');
  }
}

export const nurseStationTradeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nurse-station/pending-review',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listPendingReview()));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/nurse-station/orders/:orderId/review',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reviewOrder({
          orderId: c.params.orderId,
          decision: String(b.decision ?? '') as 'approve' | 'reject',
          comment: b.comment ? String(b.comment) : undefined,
          reviewerId: view.id,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/nurse-station/approved-orders',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listApproved()));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/nurse-station/orders/:orderId/execute',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        const wb = (b.wristband ?? {}) as Record<string, unknown>;
        return json(ok(executeAtBedside({
          orderId: c.params.orderId,
          wristband: {
            patientId: String(wb.patientId ?? ''),
            scannedPatientId: String(wb.scannedPatientId ?? ''),
            scannedOrderId: String(wb.scannedOrderId ?? ''),
          },
          executorId: view.id,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/nurse-station/orders/:orderId/execution-slip',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(buildExecutionSlip({ orderId: c.params.orderId })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/nurse-station/executed-orders',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listExecuted()));
      } catch (e) { return mapError(e); }
    },
  },
];
