/**
 * 健澜科技 jlmedaios - 互联网电子处方 BFF 路由（M3-L）
 *
 * 医生端（开方/重提/取消/会话处方）：权限码 internet:prescription；
 * 药师端（审方队列/审方）：权限码 internet:prescription:audit；
 * 患者端（我的处方/详情）：患者 JWT（roles=['patient']）。
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
  EPrescriptionError,
  createEPrescriptionByDoctor,
  resubmitEPrescriptionByDoctor,
  cancelEPrescriptionByDoctor,
  reviewEPrescriptionByPharmacist,
  listForAudit,
  listSessionPrescriptions,
  listMyPrescriptions,
  getMyPrescription,
} from '../aggregators/internetPrescriptionAggregator';

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof EPrescriptionError) {
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

/** 医生鉴权：internet:prescription，返回 AuthView 或拒绝响应 */
async function doctorGuard(c: Ctx): Promise<AuthView | Response> {
  const denied = requirePermissionCode(c, 'internet:prescription');
  if (denied) return denied;
  const view = await requester(c);
  if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
  return view;
}

/** 药师鉴权：internet:prescription:audit，返回 AuthView 或拒绝响应 */
async function pharmacistGuard(c: Ctx): Promise<AuthView | Response> {
  const denied = requirePermissionCode(c, 'internet:prescription:audit');
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

export const internetPrescriptionRoutes: RouteDef[] = [
  /* ============================ 医生端 ============================ */

  // 会话内开方
  {
    method: 'POST',
    path: '/api/v1/internet/prescription/create',
    handle: async (c) => {
      const view = await doctorGuard(c);
      if (view instanceof Response) return view;
      try {
        const body = await c.body<{
          sessionId: string;
          items: unknown[];
          counsel?: string;
          idempotencyKey: string;
        }>();
        return json(
          ok(await createEPrescriptionByDoctor(view, {
            sessionId: body.sessionId,
            items: body.items as never,
            counsel: body.counsel,
            idempotencyKey: body.idempotencyKey,
          })),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 退回后修改并重提
  {
    method: 'POST',
    path: '/api/v1/internet/prescription/resubmit',
    handle: async (c) => {
      const view = await doctorGuard(c);
      if (view instanceof Response) return view;
      try {
        const body = await c.body<{ prescriptionId: string; items: unknown[] }>();
        return json(
          ok(
            await resubmitEPrescriptionByDoctor(view, {
              prescriptionId: body.prescriptionId,
              items: body.items as never,
            }),
          ),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 取消处方
  {
    method: 'POST',
    path: '/api/v1/internet/prescription/cancel',
    handle: async (c) => {
      const view = await doctorGuard(c);
      if (view instanceof Response) return view;
      try {
        const body = await c.body<{ prescriptionId: string }>();
        return json(ok(await cancelEPrescriptionByDoctor(view, body.prescriptionId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 会话内处方列表
  {
    method: 'GET',
    path: '/api/v1/internet/prescription/by-session',
    handle: async (c) => {
      const view = await doctorGuard(c);
      if (view instanceof Response) return view;
      try {
        const sessionId = c.query.get('sessionId');
        if (!sessionId) return json(fail(ErrorCode.BAD_REQUEST, '缺少 sessionId', c.traceId), 400);
        return json(ok(await listSessionPrescriptions(view, sessionId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },

  /* ============================ 药师端 ============================ */

  // 审方队列
  {
    method: 'GET',
    path: '/api/v1/internet/prescription/audit-queue',
    handle: async (c) => {
      const view = await pharmacistGuard(c);
      if (view instanceof Response) return view;
      try {
        return json(
          ok(
            await listForAudit(view, {
              status: c.query.get('status') ?? undefined,
              prescriberId: c.query.get('prescriberId') ?? undefined,
            }),
          ),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 审方动作
  {
    method: 'POST',
    path: '/api/v1/internet/prescription/review',
    handle: async (c) => {
      const view = await pharmacistGuard(c);
      if (view instanceof Response) return view;
      try {
        const body = await c.body<{
          prescriptionId: string;
          decision: 'approved' | 'rejected' | 'returned';
          auditComment?: string;
        }>();
        return json(
          ok(
            await reviewEPrescriptionByPharmacist(view, {
              prescriptionId: body.prescriptionId,
              decision: body.decision,
              auditComment: body.auditComment,
            }),
          ),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },

  /* ============================ 患者端 ============================ */

  // 我的处方列表
  {
    method: 'GET',
    path: '/api/v1/internet/prescription/my',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await listMyPrescriptions(guard.accountId, guard.patientId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 处方详情
  {
    method: 'GET',
    path: '/api/v1/internet/prescription/detail',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const id = c.query.get('id');
        if (!id) return json(fail(ErrorCode.BAD_REQUEST, '缺少处方 ID', c.traceId), 400);
        return json(ok(await getMyPrescription(guard.accountId, guard.patientId, id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
