/**
 * 健澜AI原生医院操作系统OS - P1-2 医嘱单续打/补打/重打 路由
 *
 * 前缀 /api/v1/clinical/order-sheet：
 *  - POST /print   continuation/reissue/reprint
 *  - GET  /prints?visitId=   打印历史
 *
 * 全 auth:true；doctor/nurse 可打印，其他 403 code=40300。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  OrderSheetPrintError,
  printOrderSheet,
  listPrints,
} from '../aggregators/orderSheetPrintAggregator.js';
import { OrderCpoeError } from '../aggregators/orderCpoeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof OrderSheetPrintError || err instanceof OrderCpoeError) {
    const code =
      (err as { status: number }).status === 403 ? ErrorCode.FORBIDDEN
      : (err as { status: number }).status === 404 ? ErrorCode.NOT_FOUND
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), (err as { status: number }).status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const orderSheetPrintRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/clinical/order-sheet/print',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const range = b.range as { from?: number; to?: number } | undefined;
        return json(ok(printOrderSheet({
          visitId: String(b.visitId ?? ''),
          patientId: String(b.patientId ?? ''),
          printMode: String(b.printMode ?? ''),
          range: range ? { from: Number(range.from), to: Number(range.to) } : undefined,
          operatorNote: b.operatorNote ? String(b.operatorNote) : undefined,
          roles: c.user?.roles ?? [],
          operatorId: c.user?.id ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/clinical/order-sheet/prints',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = new URL(c.req.url).searchParams.get('visitId') ?? undefined;
        return json(ok(listPrints(visitId)));
      } catch (e) { return mapError(e); }
    },
  },
];
