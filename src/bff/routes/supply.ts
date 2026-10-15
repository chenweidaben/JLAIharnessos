/**
 * 健澜科技 jlmedaios - M139-C 物资耗材管理 BFF 路由（医院运营管理）
 *
 *  GET  /api/v1/admin/supply       物资库存列表 + 低库存预警
 *  POST /api/v1/admin/supply/in    物资入库  body: { itemId, quantity, batchNo? }
 *  POST /api/v1/admin/supply/out   物资出库  body: { itemId, quantity, dept, patientId? }
 *
 * 仅登录 admin 可访问；出库库存不足时返回 409（禁止负库存，保证账实相符）。
 * 统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  getLowStockAlerts,
  recordSupplyIn,
  recordSupplyOut,
  supplyView,
} from '../aggregators/supplyAggregator.js';

/** 业务校验失败统一转 400；库存不足转 409 */
function toErrorResponse(e: unknown): Response {
  const msg = e instanceof Error ? e.message : '物资操作失败';
  if (msg.startsWith('库存不足')) return json(fail(ErrorCode.CONFLICT, msg), 409);
  return json(fail(ErrorCode.BAD_REQUEST, msg), 400);
}

export const supplyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/supply',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(supplyView()));
      } catch (e) {
        return json(fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '库存查询失败'), 500);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/supply/in',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<{ itemId?: string; quantity?: number; batchNo?: string | null }>();
        const stock = recordSupplyIn(body?.itemId ?? '', body?.quantity ?? 0, body?.batchNo ?? null);
        return json(ok({ stock, alerts: getLowStockAlerts() }, '入库成功'));
      } catch (e) {
        return toErrorResponse(e);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/supply/out',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<{
          itemId?: string;
          quantity?: number;
          dept?: string;
          patientId?: string | null;
        }>();
        const stock = recordSupplyOut(
          body?.itemId ?? '',
          body?.quantity ?? 0,
          body?.dept ?? '',
          body?.patientId ?? null,
        );
        return json(ok({ stock, alerts: getLowStockAlerts() }, '出库成功'));
      } catch (e) {
        return toErrorResponse(e);
      }
    },
  },
];
