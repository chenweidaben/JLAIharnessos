/**
 * 健澜AI原生医院操作系统OS - P1-3 手术麻醉闭环路由
 *
 * 前缀 /api/v1/surgery-workflow（避开既有 /surgery/* /operation/* /anesthesia/*）：
 *  - POST /requests                       surgeon 建申请
 *  - POST /requests/:reqId/schedule        admin 排班（手术间互斥）
 *  - POST /requests/:reqId/transition      surgeon/admin 状态机流转
 *  - POST /requests/:reqId/anesthesia-record  anesthetist 麻醉记录
 *  - POST /requests/:reqId/pacu-note          nurse PACU 复苏
 *  - GET  /requests?visitId=               列表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  SurgeryWorkflowError,
  createRequest,
  scheduleRequest,
  transition,
  recordAnesthesia,
  recordPacu,
  listRequests,
} from '../aggregators/surgeryWorkflowAggregator.js';
import { OrderCpoeError } from '../aggregators/orderCpoeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof SurgeryWorkflowError || err instanceof OrderCpoeError) {
    const s = (err as { status: number }).status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

function idFromPath(c: Ctx): string {
  return String(c.params?.reqId ?? '');
}

export const surgeryWorkflowRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/surgery-workflow/requests',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createRequest({
          visitId: String(b.visitId ?? ''),
          patientId: String(b.patientId ?? ''),
          surgeryName: String(b.surgeryName ?? ''),
          plannedStart: Number(b.plannedStart ?? Date.now()),
          plannedDurationMin: Number(b.plannedDurationMin ?? 0),
          surgeonId: String(b.surgeonId ?? c.user?.id ?? ''),
          roles: c.user?.roles ?? [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/surgery-workflow/requests/:reqId/schedule',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(scheduleRequest({
          reqId: idFromPath(c),
          orRoom: String(b.orRoom ?? ''),
          scheduledStart: Number(b.scheduledStart ?? 0),
          scheduledEnd: Number(b.scheduledEnd ?? 0),
          roles: c.user?.roles ?? [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/surgery-workflow/requests/:reqId/transition',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(transition({
          reqId: idFromPath(c),
          toState: String(b.toState ?? ''),
          note: b.note ? String(b.note) : undefined,
          roles: c.user?.roles ?? [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/surgery-workflow/requests/:reqId/anesthesia-record',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(recordAnesthesia({
          reqId: idFromPath(c),
          vitals: b.vitals as { hr?: number; sbp?: number; dbp?: number; spo2?: number } | undefined,
          anesthesiaType: b.anesthesiaType ? String(b.anesthesiaType) : undefined,
          drugs: Array.isArray(b.drugs) ? (b.drugs as string[]) : undefined,
          fluidsIn: b.fluidsIn === undefined ? undefined : Number(b.fluidsIn),
          fluidsOut: b.fluidsOut === undefined ? undefined : Number(b.fluidsOut),
          roles: c.user?.roles ?? [],
          operatorId: c.user?.id ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/surgery-workflow/requests/:reqId/pacu-note',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(recordPacu({
          reqId: idFromPath(c),
          aldreteScore: Number(b.aldreteScore ?? -1),
          consciousness: String(b.consciousness ?? ''),
          painScore: Number(b.painScore ?? -1),
          dischargedToWardAt: b.dischargedToWardAt === undefined ? undefined : Number(b.dischargedToWardAt),
          roles: c.user?.roles ?? [],
          operatorId: c.user?.id ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/surgery-workflow/requests',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = new URL(c.req.url).searchParams.get('visitId') ?? undefined;
        return json(ok(listRequests(visitId)));
      } catch (e) { return mapError(e); }
    },
  },
];
