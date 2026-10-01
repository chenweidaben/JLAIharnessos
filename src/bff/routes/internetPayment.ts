/**
 * 健澜科技 jlmedaios - 互联网在线支付 BFF 路由（M3-M）
 *
 * 患者端（发起支付/取消/我的支付/我的票据）：患者 JWT（roles=['patient']）；
 * 财务/药师端（支付队列/票据队列/冲正）：权限码
 *   internet:payment:refund（冲正）/ internet:invoice:view（票据查看）。
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
  InternetPaymentError,
  createPaymentByPatient,
  cancelPaymentByPatient,
  refundPaymentByFinance,
  listMyPayments,
  listMyInvoices,
  listFinancePayments,
  listFinanceInvoices,
  getPatientIdByAccount,
} from '../aggregators/internetPaymentAggregator';
import { listMyPrescriptions } from '../aggregators/internetPrescriptionAggregator';

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof InternetPaymentError) {
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

/** 财务/药师鉴权：internet:payment:refund 或 internet:invoice:view 至少其一 */
async function financeGuard(c: Ctx): Promise<AuthView | Response> {
  const deniedRefund = requirePermissionCode(c, 'internet:payment:refund');
  const deniedInvoice = requirePermissionCode(c, 'internet:invoice:view');
  // requirePermissionCode 返回 Response（拒绝）或 null（通过）
  if (deniedRefund && deniedInvoice) return deniedRefund;
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

export const internetPaymentRoutes: RouteDef[] = [
  /* ============================ 患者端 ============================ */

  // 发起在线支付（mock 渠道下单即完成闭环）
  {
    method: 'POST',
    path: '/api/v1/internet/payment/create',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await readBody<{
          prescriptionId: string;
          channel?: 'wechat' | 'alipay' | 'bank_card' | 'mock';
          idempotencyKey: string;
        }>(c);
        const channel = body.channel ?? 'mock';
        if (!['wechat', 'alipay', 'bank_card', 'mock'].includes(channel)) {
          return json(fail(ErrorCode.BAD_REQUEST, '不支持的支付渠道', c.traceId), 400);
        }
        const result = await createPaymentByPatient(guard.accountId, guard.patientId, {
          prescriptionId: body.prescriptionId,
          channel: channel as 'wechat' | 'alipay' | 'bank_card' | 'mock',
          idempotencyKey: body.idempotencyKey,
        });
        return json(ok(result));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 取消在途支付单
  {
    method: 'POST',
    path: '/api/v1/internet/payment/cancel',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await readBody<{ paymentId: string }>(c);
        const payment = await cancelPaymentByPatient(
          guard.accountId, guard.patientId, body.paymentId,
        );
        return json(ok({ payment }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 我的支付单
  {
    method: 'GET',
    path: '/api/v1/internet/payment/my',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const payments = await listMyPayments(guard.accountId, guard.patientId);
        return json(ok({ payments }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 我的电子票据
  {
    method: 'GET',
    path: '/api/v1/internet/payment/my-invoices',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const invoices = await listMyInvoices(guard.accountId, guard.patientId);
        return json(ok({ invoices }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 可支付处方（已审方通过、尚未支付）
  {
    method: 'GET',
    path: '/api/v1/internet/payment/payable',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const all = await listMyPrescriptions(guard.accountId, guard.patientId);
        const payable = all.filter((rx) => rx.status === 'approved');
        return json(ok({ payable }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 我的实名患者 ID（就诊人档案实名后才有 patient_id）
  {
    method: 'GET',
    path: '/api/v1/internet/payment/patient-profile',
    handle: async (c) => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      try {
        const patientId = await getPatientIdByAccount(c.user.id);
        if (!patientId) {
          return json(fail(ErrorCode.NOT_FOUND, '尚未完成实名建档', c.traceId), 404);
        }
        return json(ok({ accountId: c.user.id, patientId }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  /* ============================ 财务/药师端 ============================ */

  // 支付队列
  {
    method: 'GET',
    path: '/api/v1/internet/payment/finance-queue',
    handle: async (c) => {
      const view = await financeGuard(c);
      if (view instanceof Response) return view;
      try {
        const status = c.query.get('status') as
          | 'pending' | 'processing' | 'paid' | 'cancelled' | 'all' | null;
        const payments = await listFinancePayments(status ?? 'all');
        return json(ok({ payments }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 票据队列
  {
    method: 'GET',
    path: '/api/v1/internet/payment/finance-invoices',
    handle: async (c) => {
      const view = await financeGuard(c);
      if (view instanceof Response) return view;
      try {
        const status = c.query.get('status') as 'issued' | 'reversed' | 'all' | null;
        const invoices = await listFinanceInvoices(status ?? 'all');
        return json(ok({ invoices }));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },

  // 财务冲正（已支付 → 取消 + 票据冲红）
  {
    method: 'POST',
    path: '/api/v1/internet/payment/refund',
    handle: async (c) => {
      const view = await financeGuard(c);
      if (view instanceof Response) return view;
      try {
        const body = await readBody<{ paymentId: string; reason: string }>(c);
        const result = await refundPaymentByFinance(view, body.paymentId, body.reason);
        return json(ok(result));
      } catch (e) {
        return mapError(e, c);
      }
    },
  },
];
