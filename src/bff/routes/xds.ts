/**
 * 健澜AI原生医院操作系统OS - P5-3 XDS 文档共享路由
 *
 * 前缀 /api/v1/xds：
 *  - POST /documents              注册文档（doctor/admin）
 *  - GET  /documents               检索元数据
 *  - GET  /documents/:id         取元数据
 *  - GET  /documents/:id/content 取内容 + hashValid
 *  - GET  /document-types         类型码表（≥8 LOINC 风格）
 *  - POST /_seed                  灌样本（仅 DEMO_MODE）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  DOCUMENT_TYPES, getContent, getMeta, listTypes, query, register, seed,
} from '../aggregators/xdsAggregator.js';

function requireJwt(c: Ctx): Response | null {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未认证'), 401);
  if ((c.user.roles ?? []).includes('patient')) {
    return json(fail(ErrorCode.FORBIDDEN, 'patient 角色不可访问 XDS'), 403);
  }
  return null;
}

export const xdsRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/xds/documents',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireJwt(c); if (denied) return denied;
      const b = (await c.body()) as Record<string, any>;
      if (!b.patientId) return json(fail(ErrorCode.BAD_REQUEST, 'patientId 必填'), 400);
      if (!b.title) return json(fail(ErrorCode.BAD_REQUEST, 'title 必填'), 400);
      if (!b.authorId) return json(fail(ErrorCode.BAD_REQUEST, 'authorId 必填'), 400);
      if (!b.authorOrg) return json(fail(ErrorCode.BAD_REQUEST, 'authorOrg 必填'), 400);
      const r = register({
        patientId: b.patientId,
        masterPatientId: b.masterPatientId,
        documentType: b.documentType,
        title: b.title,
        authorId: b.authorId,
        authorOrg: b.authorOrg,
        content: b.content,
        contentType: b.contentType,
      });
      if (!r.ok) {
        if (r.error === 'invalid-type') return json(fail(ErrorCode.BAD_REQUEST, `documentType 必须在码表内：${DOCUMENT_TYPES.map(t=>t.code).join('/')}`), 400);
        if (r.error === 'empty-content') return json(fail(ErrorCode.BAD_REQUEST, 'content 不能为空'), 400);
        return json(fail(ErrorCode.CONFLICT, 'duplicate（同 patientId+documentType+contentHash 已存在）'), 409);
      }
      const { content: _c, ...meta } = r.doc; void _c;
      return json(ok(meta), 201);
    },
  },
  {
    method: 'GET',
    path: '/api/v1/xds/documents',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireJwt(c); if (denied) return denied;
      const sp = new URL(c.req.url).searchParams;
      const from = sp.get('from') ?? undefined;
      const to = sp.get('to') ?? undefined;
      if (from && Number.isNaN(Date.parse(from))) return json(fail(ErrorCode.BAD_REQUEST, 'from ISO 非法'), 400);
      if (to && Number.isNaN(Date.parse(to))) return json(fail(ErrorCode.BAD_REQUEST, 'to ISO 非法'), 400);
      return json(ok(query({
        patientId: sp.get('patientId') ?? undefined,
        documentType: sp.get('documentType') ?? undefined,
        from, to,
        limit: Number(sp.get('limit') ?? 50),
        offset: Number(sp.get('offset') ?? 0),
      })));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/xds/documents/:documentId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireJwt(c); if (denied) return denied;
      const r = getMeta(c.params.documentId);
      if (!r) return json(fail(ErrorCode.NOT_FOUND, 'document 不存在'), 404);
      return json(ok(r));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/xds/documents/:documentId/content',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireJwt(c); if (denied) return denied;
      const r = getContent(c.params.documentId);
      if (!r) return json(fail(ErrorCode.NOT_FOUND, 'document 不存在'), 404);
      return json(ok(r));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/xds/document-types',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireJwt(c); if (denied) return denied;
      return json(ok({ types: listTypes() }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/xds/_seed',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (process.env.DEMO_MODE !== '1') return json(fail(ErrorCode.NOT_FOUND, '未找到'), 404);
      if (!(c.user?.roles ?? []).includes('admin')) return json(fail(ErrorCode.FORBIDDEN, '仅 admin'), 403);
      const n = seed();
      return json(ok({ seeded: n }));
    },
  },
];
