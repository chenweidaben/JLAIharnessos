/**
 * 健澜AI原生医院操作系统OS - P1-1 三级检诊工作流路由
 *
 * 前缀 /api/v1/inpatient/ward-round-signoff（避开既有 inpatient/rounds、rounds、ward-rounds）：
 *  - POST /notes                 住院医写病程（submit → draft）
 *  - POST /notes/:noteId/review  主治 approve/reject（approve→chief_sign，reject→draft）
 *  - POST /notes/:noteId/chief-sign 主任终签（draft 直签标越级 bypassedLevel=attending）
 *  - GET  /notes?visitId=        列表
 *  - GET  /notes/:noteId/trail   签审意见时间线
 *
 * 全 auth:true；角色权限 resident/attending/chief（admin 通配）；越权 403 code=40300。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  WardRoundSignoffError,
  createNote,
  reviewNote,
  chiefSignNote,
  listNotes,
  noteTrail,
} from '../aggregators/wardRoundSignoffAggregator.js';
import { OrderCpoeError } from '../aggregators/orderCpoeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof WardRoundSignoffError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
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

export const wardRoundSignoffRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/inpatient/ward-round-signoff/notes',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createNote({
          visitId: String(b.visitId ?? ''),
          patientId: String(b.patientId ?? ''),
          content: String(b.content ?? ''),
          roles: c.user?.roles ?? [],
          authorId: c.user?.id ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/ward-round-signoff/notes/:noteId/review',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reviewNote({
          noteId: c.params.noteId,
          action: b.action === 'reject' ? 'reject' : 'approve',
          comment: b.comment ? String(b.comment) : undefined,
          patientId: b.patientId ? String(b.patientId) : undefined,
          roles: c.user?.roles ?? [],
          reviewerId: c.user?.id ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/ward-round-signoff/notes/:noteId/chief-sign',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(chiefSignNote({
          noteId: c.params.noteId,
          comment: b.comment ? String(b.comment) : undefined,
          patientId: b.patientId ? String(b.patientId) : undefined,
          roles: c.user?.roles ?? [],
          reviewerId: c.user?.id ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/ward-round-signoff/notes',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = new URL(c.req.url).searchParams.get('visitId') ?? undefined;
        return json(ok(listNotes(visitId)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/ward-round-signoff/notes/:noteId/trail',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(noteTrail(c.params.noteId)));
      } catch (e) { return mapError(e); }
    },
  },
];
