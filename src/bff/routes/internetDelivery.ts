/**
 * 健澜科技 jlmedaios - 互联网处方配送 + 在线报告 BFF 路由（M3-N）
 *
 * 药房/财务端（建单/履约/全部配送）：权限码
 *   internet:delivery:create（建单）/ internet:delivery:fulfill（履约）；
 * 患者端（我的配送/我的报告）：患者 JWT（roles=['patient']）强归属；
 * 医护端（报告查询）：internet:report:view，需指定 patientId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../types';
import { requirePermissionCode, requireRole } from '../middleware/auth';
import { getUserById, getUserRoleLinks } from '../../db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import {
  InternetDeliveryError,
  createDeliveryByPharmacy,
  fulfillDeliveryByPharmacy,
  listMyDeliveries,
  listDeliveriesForPharmacy,
  listPaidRxForDelivery,
  listReportsByPatient,
  listReportsForStaff,
} from '../aggregators/deliveryAggregator';

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof InternetDeliveryError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 403
            ? ErrorCode.FORBIDDEN
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message, c.traceId), err.status);
  }
  console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(
    fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
    500,
  );
}

/** 解析登录用户完整视图（含科室/数据范围/权限）。 */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 权限守卫：返回 AuthView 或拒绝 Response */
async function permissionGuard(
  c: Ctx,
  code: string,
): Promise<AuthView | Response> {
  const denied = requirePermissionCode(c, code);
  if (denied) return denied;
  const view = await requester(c);
  if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
  return view;
}

/** 患者鉴权：roles=['patient']，返回 accountId + patientId */
function patientGuard(
  c: Ctx,
): { accountId: string; patientId: string } | Response {
  const denied = requireRole(c, 'patient');
  if (denied) return denied;
  const pid = c.query.get('patientId');
  if (!pid) return json(fail(ErrorCode.BAD_REQUEST, '缺少 patientId', c.traceId), 400);
  return { accountId: c.user!.id, patientId: pid };
}

async function readBody<T>(c: Ctx): Promise<T> {
  try {
    return (await c.body()) as T;
  } catch {
    return {} as T;
  }
}

export const internetDeliveryRoutes: RouteDef[] = [
  /* ============================ 药房/财务端：配送 ============================ */

  // 创建配送单（自取 / 快递）
  {
    method: 'POST',
    path: '/api/v1/internet/delivery/create',
    handle: async (c) => {
      const view = await permissionGuard(c, 'internet:delivery:create');
      if (view instanceof Response) return view;
      try {
        const body = await readBody<{
          rxId: string;
          channel: 'self_pick' | 'express';
          address?: string;
        }>(c);
        const result = await createDeliveryByPharmacy(view, {
          rxId: body.rxId,
          channel: body.channel,
          address: body.address,
        });
        return json(ok(result));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 履约状态推进（打包/发货/送达/核销/取消）
  {
    method: 'POST',
    path: '/api/v1/internet/delivery/fulfill',
    handle: async (c) => {
      const view = await permissionGuard(c, 'internet:delivery:fulfill');
      if (view instanceof Response) return view;
      try {
        const body = await readBody<{
          deliveryId: string;
          to: 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled';
          courierCompany?: string;
          trackingNo?: string;
        }>(c);
        const delivery = await fulfillDeliveryByPharmacy(view, body);
        return json(ok({ delivery }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 可配送处方（已支付；internet:delivery:create）
  {
    method: 'GET',
    path: '/api/v1/internet/delivery/paid-rx',
    handle: async (c) => {
      const view = await permissionGuard(c, 'internet:delivery:create');
      if (view instanceof Response) return view;
      try {
        const rxList = await listPaidRxForDelivery();
        return json(ok({ rxList }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 全部配送单（药房）
  {
    method: 'GET',
    path: '/api/v1/internet/delivery/all',
    handle: async (c) => {
      const view = await permissionGuard(c, 'internet:delivery:fulfill');
      if (view instanceof Response) return view;
      try {
        const status = c.query.get('status') as
          | 'created' | 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled' | 'all' | null;
        const deliveries = await listDeliveriesForPharmacy(view, status ?? 'all');
        return json(ok({ deliveries }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  /* ============================ 患者端 ============================ */

  // 我的配送单（患者本人；可指定 deliveryId 查看单条）
  {
    method: 'GET',
    path: '/api/v1/internet/delivery/my',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const deliveryId = c.query.get('deliveryId') ?? undefined;
        const deliveries = await listMyDeliveries(
          guard.accountId, guard.patientId, deliveryId,
        );
        return json(ok({ deliveries }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  /* ============================ 报告查询 ============================ */

  // 患者本人报告（检验/影像/AI 解读）
  {
    method: 'GET',
    path: '/api/v1/internet/reports/my',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const visitId = c.query.get('visitId') ?? undefined;
        const reports = await listReportsByPatient(
          guard.accountId, guard.patientId, visitId,
        );
        return json(ok(reports));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 医护报告查询（需指定 patientId）
  {
    method: 'GET',
    path: '/api/v1/internet/reports',
    handle: async (c) => {
      const view = await permissionGuard(c, 'internet:report:view');
      if (view instanceof Response) return view;
      try {
        const patientId = c.query.get('patientId') ?? undefined;
        const visitId = c.query.get('visitId') ?? undefined;
        const reports = await listReportsForStaff(view, patientId, visitId);
        return json(ok(reports));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },
];
