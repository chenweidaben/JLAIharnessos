/**
 * 健澜AI原生医院操作系统OS - P2-1 病历版本管理路由
 *
 * 前缀 /api/v1/emr-versions（避开 /medical-records/:id/versions 等既有 GET 桩）：
 *  - POST /notes                              新建 v1
 *  - POST /notes/:noteId/revise                修订（finalized → 409）
 *  - GET  /notes?visitId=                      列表
 *  - GET  /notes/:noteId/versions              版本列表
 *  - GET  /notes/:noteId/versions/:v           单版只读
 *  - GET  /notes/:noteId/diff?from=&to=        版本对比
 *  - POST /notes/:noteId/finalize              主任终稿
 *  - POST /notes/:noteId/unlock-for-edit       主任审批解锁
 *  - POST /notes/:noteId/re-lock               解锁后再锁
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  EmrVersionError,
  createNote,
  revise,
  listVersions,
  getVersion,
  diffBetween,
  finalize,
  unlockForEdit,
  reLock,
  listNotes,
} from '../aggregators/emrVersionsAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof EmrVersionError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const nid = (c: Ctx): string => String(c.params?.noteId ?? '');

export const emrVersionsRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/emr-versions/notes',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createNote({
          visitId: String(b.visitId ?? ''), patientId: String(b.patientId ?? ''),
          title: String(b.title ?? ''), noteType: String(b.noteType ?? ''),
          content: (b.content ?? {}) as Record<string, string>,
          roles: c.user?.roles ?? [], authorId: c.user?.id ?? '',
          authorRole: (c.user?.roles ?? [])[0] ?? 'unknown',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/emr-versions/notes/:noteId/revise',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(revise(nid(c), (b.content ?? {}) as Record<string, string>, c.user?.roles ?? [], c.user?.id ?? '', (c.user?.roles ?? [])[0] ?? 'unknown')));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/emr-versions/notes',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = new URL(c.req.url).searchParams.get('visitId') ?? undefined;
        return json(ok(listNotes(visitId || undefined)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/emr-versions/notes/:noteId/versions',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(listVersions(nid(c)))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/emr-versions/notes/:noteId/versions/:v',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(getVersion(nid(c), Number(c.params?.v ?? 0)))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/emr-versions/notes/:noteId/diff',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        return json(ok(diffBetween(nid(c), Number(u.searchParams.get('from') ?? 0), Number(u.searchParams.get('to') ?? 0))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/emr-versions/notes/:noteId/finalize',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(finalize(nid(c), c.user?.roles ?? []))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/emr-versions/notes/:noteId/unlock-for-edit',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(unlockForEdit(nid(c), String(b.reason ?? ''), String(b.approverId ?? ''), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/emr-versions/notes/:noteId/re-lock',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(reLock(nid(c), c.user?.roles ?? []))); }
      catch (e) { return mapError(e); }
    },
  },
];
