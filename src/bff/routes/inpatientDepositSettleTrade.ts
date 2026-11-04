/**
 * 健澜AI原生医院操作系统OS - P0-5 住院押金 / 出院结算交易路由
 *
 * 路径前缀 /api/v1/inpatient/deposit-settle（避开既有 inpatientBillingMgmtV13.ts 的
 * /api/v1/inpatient-billing-mgmt，M86-H dischargeSettle.ts 的 /api/v1/discharge/*，
 * 以及 billingCharge.ts 的 /api/v1/billing/*）。
 * 全部 auth:true；状态机非法跃迁 409；金额整数分。
 *
 * 权限说明：本聚合器按"已登录收费员且权限集合非空"放行（与 P0-1/P0-3/P0-4 同层），
 * TODO-prod: 在各写路由内分别校验 view.permissions 包含
 * billing:deposit:pay / billing:deposit:warning / billing:settle:discharge 等
 * 细粒度码并接入 role_permissions 种子。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  InpatientDepositSettleError,
  payDeposit,
  assessDepositWarning,
  settleDischarge,
  getAccount,
  listDeposits,
  listSettlements,
} from '../aggregators/inpatientDepositSettleAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof InpatientDepositSettleError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

/** 押金结算交易：要求已登录且权限集合非空（即真实收费员账号）。 */
function assertStaff(view: AuthView): void {
  if (!view.permissions || view.permissions.length === 0) {
    throw new InpatientDepositSettleError(403, '无住院押金结算交易权限');
  }
}

export const inpatientDepositSettleTradeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/inpatient/deposit-settle/accounts/:visitId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(getAccount(c.params.visitId)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/deposit-settle/deposits',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(payDeposit({
          visitId: String(b.visitId ?? ''),
          amountCents: typeof b.amountCents === 'number' ? b.amountCents : NaN,
          payMethod: String(b.payMethod ?? ''),
          operatorId: view.id,
          receiptNo: b.receiptNo ? String(b.receiptNo) : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/deposit-settle/deposits/:visitId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listDeposits(c.params.visitId)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/deposit-settle/warning/:visitId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const thresholdRaw = c.query.get('thresholdCents');
        const thresholdCents = thresholdRaw ? Number(thresholdRaw) : undefined;
        return json(ok(assessDepositWarning({
          visitId: c.params.visitId,
          thresholdCents: typeof thresholdCents === 'number' && Number.isInteger(thresholdCents) ? thresholdCents : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/deposit-settle/settlements',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        const b = (await c.body()) as Record<string, unknown>;
        const rawItems = Array.isArray(b.items) ? b.items as Array<Record<string, unknown>> : [];
        return json(ok(settleDischarge({
          visitId: String(b.visitId ?? ''),
          operatorId: view.id,
          items: rawItems.map((it) => ({
            name: String(it.name ?? ''),
            quantity: typeof it.quantity === 'number' ? it.quantity : NaN,
            unitPriceCents: typeof it.unitPriceCents === 'number' ? it.unitPriceCents : NaN,
          })),
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/deposit-settle/settlements',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        assertStaff(view);
        return json(ok(listSettlements()));
      } catch (e) { return mapError(e); }
    },
  },
];
