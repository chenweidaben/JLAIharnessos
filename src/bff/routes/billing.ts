/**
 * 健澜科技 jlmedaios - 收费结算 BFF 路由（M3-B）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 结算单队列/详情（billing:read）；
 *  - 待结算费用查询（billing:read）；
 *  - 计费（billing:charge，幂等）；
 *  - 归集结算单（billing:charge）；
 *  - 收款 + 开票（billing:charge，Saga 正向）；
 *  - 退费（billing:refund，Saga 补偿，高风险单独授权）；
 *  - 作废（billing:refund）。
 *
 * 每个写操作校验权限码 + DataScope；统一错误信封；
 * 业务变更与审计哈希链在同一事务提交。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  BillingError,
  createSettlement,
  generateFeeItems,
  getOutstanding,
  getSettlementDetail,
  getSettlementQueue,
  paySettlementFlow,
  refundFeeItem,
  voidSettlementFlow,
} from '../aggregators/billingAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof BillingError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '收费结算处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
  render: (data: T) => Response = (d) => json(ok(d)),
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      if (data instanceof Response) return data;
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

export const billingRoutes: RouteDef[] = [
  {
    // 结算单队列
    method: 'GET',
    path: '/api/v1/billing/queue',
    handle: guarded('billing:read', (_c, view) => getSettlementQueue(view)),
    auth: true,
  },
  {
    // 计费（幂等）
    method: 'POST',
    path: '/api/v1/billing/visits/:visitId/generate',
    handle: guarded('billing:charge', (c, view) =>
      generateFeeItems(view, c.params.visitId),
    ),
    auth: true,
  },
  {
    // 待结算费用
    method: 'GET',
    path: '/api/v1/billing/visits/:visitId/outstanding',
    handle: guarded('billing:read', (c, view) =>
      getOutstanding(view, c.params.visitId),
    ),
    auth: true,
  },
  {
    // 归集结算单
    method: 'POST',
    path: '/api/v1/billing/settlements',
    handle: guarded('billing:charge', async (c, view) =>
      createSettlement(view, await c.body()),
    ),
    auth: true,
  },
  {
    // 结算单详情
    method: 'GET',
    path: '/api/v1/billing/settlements/:id',
    handle: guarded('billing:read', (c, view) =>
      getSettlementDetail(view, c.params.id),
    ),
    auth: true,
  },
  {
    // 收款 + 开票
    method: 'POST',
    path: '/api/v1/billing/settlements/:id/pay',
    handle: guarded('billing:charge', (c, view) =>
      paySettlementFlow(view, c.params.id),
    ),
    auth: true,
  },
  {
    // 作废（未付）
    method: 'POST',
    path: '/api/v1/billing/settlements/:id/void',
    handle: guarded('billing:refund', (c, view) =>
      voidSettlementFlow(view, c.params.id),
    ),
    auth: true,
  },
  {
    // 退费（Saga 补偿）
    method: 'POST',
    path: '/api/v1/billing/refunds',
    handle: guarded('billing:refund', async (c, view) =>
      refundFeeItem(view, await c.body()),
    ),
    auth: true,
  },
];
