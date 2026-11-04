/**
 * 健澜AI原生医院操作系统OS - P0-3 护士站工作台补全路由
 *
 * 在既有 nurseStation.ts（3 GET 只读）与 nurseStationTrade.ts（6 交易路由）之外，
 * 新增四条独立子路径，全部 auth:true：
 *  - POST /api/v1/nurse-station/pda/execute          （PDA 按执行单床边执行）
 *  - POST /api/v1/nurse-station/vitals               （体征录入，生理区间硬校验）
 *  - POST /api/v1/nurse-station/nursing-records     （护理记录书写）
 *  - GET  /api/v1/nurse-station/ward-execution-sheet（护理执行单汇总）
 *
 * 权限复用 P0-2 assertCan(execute 域)，越权 403 → code=40300；
 * 错误统一由 OrderCpoeError.status 映射 HTTP 码（400/403/404/409）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { assertCan, OrderCpoeError } from '../aggregators/orderCpoeAggregator.js';
import {
  buildWardExecutionSheet,
  pdaExecuteBySlip,
  recordVitals,
  writeNursingRecord,
} from '../aggregators/nurseStationWardAggregator.js';

function actorOf(c: Ctx): { roles: string[]; permissions: string[] } {
  return {
    roles: c.user?.roles ?? [],
    permissions: c.user?.permissions ?? [],
  };
}

function mapError(err: unknown): Response {
  if (err instanceof OrderCpoeError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const nurseStationWardRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/nurse-station/pda/execute',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const rec = pdaExecuteBySlip({
          slipNo: String(b.slipNo ?? ''),
          scannedPatientId: String(b.scannedPatientId ?? ''),
          executedBy: c.user?.id ?? 'unknown',
          executedByName: c.user?.name,
          actor: actorOf(c),
        });
        return json(ok(rec));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/nurse-station/vitals',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        assertCan(actorOf(c), 'execute');
        const b = (await c.body()) as Record<string, unknown>;
        const rec = recordVitals({
          visitId: String(b.visitId ?? ''),
          patientId: String(b.patientId ?? ''),
          temperatureC: Number(b.temperatureC),
          heartRateBpm: Number(b.heartRateBpm),
          sbp: Number(b.sbp),
          dbp: Number(b.dbp),
          recordedBy: c.user?.id ?? 'unknown',
          recordedByName: c.user?.name,
        });
        return json(ok(rec));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/nurse-station/nursing-records',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        assertCan(actorOf(c), 'execute');
        const b = (await c.body()) as Record<string, unknown>;
        const rec = writeNursingRecord({
          visitId: String(b.visitId ?? ''),
          patientId: String(b.patientId ?? ''),
          recordType: String(b.recordType ?? ''),
          content: String(b.content ?? ''),
          writtenBy: c.user?.id ?? 'unknown',
          writtenByName: c.user?.name,
        });
        return json(ok(rec));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/nurse-station/ward-execution-sheet',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = c.query.get('visitId') ?? undefined;
        return json(ok(buildWardExecutionSheet({ visitId })));
      } catch (e) { return mapError(e); }
    },
  },
];
