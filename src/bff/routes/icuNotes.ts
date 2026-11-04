/**
 * 健澜AI原生医院操作系统OS - P1-5 ICU 监护文书路由
 *
 * 前缀 /api/v1/icu/notes（避开既有 /api/v1/icu/patients|monitoring|detail 等 GET）：
 *  - POST /admission                 icu_doctor 转入
 *  - POST /discharge                 icu_doctor 转出
 *  - POST /:visitId/vitals           icu_nurse 录多时间点体征
 *  - GET  /:visitId/vitals           按时间升序列出
 *  - POST /:visitId/scores           icu_doctor 评 APACHE2/SOFA/RASS/Ramsay
 *  - GET  /:visitId/scores           评分列表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  IcuNotesError,
  admit,
  discharge,
  recordVitals,
  listVitals,
  recordScore,
  listScores,
} from '../aggregators/icuNotesAggregator.js';
import { OrderCpoeError } from '../aggregators/orderCpoeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof IcuNotesError || err instanceof OrderCpoeError) {
    const s = (err as { status: number }).status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const vid = (c: Ctx): string => String(c.params?.visitId ?? '');
const num = (b: Record<string, unknown>, k: string) => (b[k] === undefined ? undefined : Number(b[k]));

export const icuNotesRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/icu/notes/admission',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(admit({
          visitId: String(b.visitId ?? ''), patientId: String(b.patientId ?? ''),
          reason: String(b.reason ?? ''), acuityLevel: Number(b.acuityLevel ?? 0),
          plannedVentHours: Number(b.plannedVentHours ?? 0),
          roles: c.user?.roles ?? [], operatorId: c.user?.id ?? 'icu',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/icu/notes/discharge',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(discharge({
          visitId: String(b.visitId ?? ''), patientId: String(b.patientId ?? ''),
          disposition: String(b.disposition ?? ''), roles: c.user?.roles ?? [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/icu/notes/:visitId/vitals',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(recordVitals({
          visitId: vid(c), patientId: String(b.patientId ?? ''),
          recordedAt: Number(b.recordedAt ?? Date.now()),
          heartRate: Number(b.heartRate ?? 0), sbp: Number(b.sbp ?? 0), dbp: Number(b.dbp ?? 0),
          respRate: Number(b.respRate ?? 0), spo2: Number(b.spo2 ?? 0),
          temperatureC: Number(b.temperatureC ?? 0), gcsScore: Number(b.gcsScore ?? 0),
          urineOutputMl: Number(b.urineOutputMl ?? 0),
          roles: c.user?.roles ?? [], operatorId: c.user?.id ?? 'n',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/icu/notes/:visitId/vitals',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(listVitals(vid(c)))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/icu/notes/:visitId/scores',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(recordScore({
          visitId: vid(c), patientId: String(b.patientId ?? ''),
          scoreType: String(b.scoreType ?? ''),
          items: (b.items ?? {}) as Record<string, number>,
          recordedAt: Number(b.recordedAt ?? Date.now()),
          roles: c.user?.roles ?? [], operatorId: c.user?.id ?? 'd',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/icu/notes/:visitId/scores',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(listScores(vid(c)))); }
      catch (e) { return mapError(e); }
    },
  },
];
