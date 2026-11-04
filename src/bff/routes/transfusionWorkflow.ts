/**
 * 健澜AI原生医院操作系统OS - P1-4 输血闭环路由
 *
 * 前缀 /api/v1/transfusion-workflow（避开既有 /api/v1/transfusions、/blood/*）：
 *  申请→血型鉴定→交叉配血→发血→床边双人核对→输注→完成，外加不良反应。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  TransfusionWorkflowError,
  createRequest,
  typeBlood,
  crossmatch,
  issueBlood,
  bedsideCheck,
  startTransfuse,
  completeTransfuse,
  recordReaction,
  listRequests,
} from '../aggregators/transfusionWorkflowAggregator.js';
import { OrderCpoeError } from '../aggregators/orderCpoeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof TransfusionWorkflowError || err instanceof OrderCpoeError) {
    const s = (err as { status: number }).status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const reqId = (c: Ctx): string => String(c.params?.reqId ?? '');

export const transfusionWorkflowRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createRequest({
          visitId: String(b.visitId ?? ''),
          patientId: String(b.patientId ?? ''),
          bloodType: String(b.bloodType ?? ''),
          units: Number(b.units ?? 0),
          indication: String(b.indication ?? ''),
          roles: c.user?.roles ?? [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests/:reqId/type',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(typeBlood({
          reqId: reqId(c), abo: String(b.abo ?? ''), rh: String(b.rh ?? ''),
          antibodyScreen: String(b.antibodyScreen ?? ''), roles: c.user?.roles ?? [], operatorId: c.user?.id ?? 't',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests/:reqId/crossmatch',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(crossmatch({
          reqId: reqId(c), donorBagNo: String(b.donorBagNo ?? ''),
          compatibility: b.compatibility === 'incompatible' ? 'incompatible' : 'compatible',
          roles: c.user?.roles ?? [], operatorId: c.user?.id ?? 't',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests/:reqId/issue',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(issueBlood({
          reqId: reqId(c), bagNo: String(b.bagNo ?? ''), expiresAt: Number(b.expiresAt ?? 0),
          roles: c.user?.roles ?? [], operatorId: c.user?.id ?? 't',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests/:reqId/bedside-check',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(bedsideCheck({
          reqId: reqId(c),
          nurseId: String(b.nurseId ?? ''),
          witnessNurseId: String(b.witnessNurseId ?? ''),
          patientId: String(b.patientId ?? ''),
          bagNo: String(b.bagNo ?? ''),
          matched: Boolean(b.matched),
          roles: c.user?.roles ?? [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests/:reqId/transfuse',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(startTransfuse(reqId(c), c.user?.roles ?? [], c.user?.id ?? 'n')));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests/:reqId/complete',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(completeTransfuse(reqId(c), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/transfusion-workflow/requests/:reqId/adverse-reaction',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(recordReaction({
          reqId: reqId(c), type: String(b.type ?? ''), severity: Number(b.severity ?? 0),
          description: String(b.description ?? ''), roles: c.user?.roles ?? [], operatorId: c.user?.id ?? 'n',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/transfusion-workflow/requests',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = new URL(c.req.url).searchParams.get('visitId') ?? undefined;
        return json(ok(listRequests(visitId)));
      } catch (e) { return mapError(e); }
    },
  },
];
