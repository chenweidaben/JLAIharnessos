/**
 * 健澜AI原生医院操作系统OS - P1-2 体温单路由
 *
 * 前缀 /api/v1/nursing/vitals-sheet（避开既有 /nursing/vitals、/nursing/temperature-chart）：
 *  - POST /entries        护士录入体征（硬校验生理区间）
 *  - GET  /curve?visitId&date=YYYY-MM-DD   24h 4h 槽位对齐曲线
 *
 * 全 auth:true；nurse 可录入+查看，doctor 仅查看，其他 403 code=40300。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  VitalsSheetError,
  recordEntry,
  getCurve,
} from '../aggregators/vitalsSheetAggregator.js';
import { OrderCpoeError } from '../aggregators/orderCpoeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof VitalsSheetError || err instanceof OrderCpoeError) {
    const code =
      (err as { status: number }).status === 403 ? ErrorCode.FORBIDDEN
      : (err as { status: number }).status === 404 ? ErrorCode.NOT_FOUND
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), (err as { status: number }).status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const vitalsSheetRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/nursing/vitals-sheet/entries',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const num = (k: string) => (b[k] === undefined ? undefined : Number(b[k]));
        return json(ok(recordEntry({
          visitId: String(b.visitId ?? ''),
          patientId: String(b.patientId ?? ''),
          temperatureC: num('temperatureC'),
          pulseBpm: num('pulseBpm'),
          respirationRate: num('respirationRate'),
          sbp: num('sbp'),
          dbp: num('dbp'),
          spo2: num('spo2'),
          weightKg: num('weightKg'),
          bowelMovements: b.bowelMovements === undefined ? undefined : Number(b.bowelMovements),
          roles: c.user?.roles ?? [],
          recordedBy: c.user?.id ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/nursing/vitals-sheet/curve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const url = new URL(c.req.url);
        const visitId = url.searchParams.get('visitId') ?? '';
        const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
        return json(ok(getCurve(visitId, date, c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
];
