/**
 * 健澜AI原生医院操作系统OS - P1-8 FHIR R4 统一 CRUD 网关路由
 *
 * 前缀 /fhir/r4（与既有 /api/fhir/* 只读桩不同前缀）：
 *  - GET  /fhir/r4/:resourceType          列表（Bundle searchset）
 *  - GET  /fhir/r4/:resourceType/:id       单条
 *  - POST /fhir/r4/:resourceType          创建（id 冲突 409）
 *  - PUT  /fhir/r4/:resourceType/:id       幂等更新（不存在 404）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  FhirR4Error,
  createResource,
  getResource,
  listResources,
  updateResource,
} from '../aggregators/fhirR4ResourcesAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof FhirR4Error) {
    const s = err.status;
    // FHIR 约定：返回 OperationOutcome
    const outcome = {
      resourceType: 'OperationOutcome',
      issue: [{ severity: s === 400 ? 'error' : 'warning', code: err.code, diagnostics: err.message }],
    };
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 409 ? ErrorCode.CONFLICT : s === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST;
    // 外层包统一 envelope，但 data 透出 OperationOutcome 便于 E2E 断言
    return json({ code, message: err.message, data: outcome, timestamp: new Date().toISOString() }, s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const rt = (c: Ctx): string => String(c.params?.resourceType ?? '');
const rid = (c: Ctx): string => String(c.params?.id ?? '');

export const fhirR4ResourcesRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/:resourceType',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(listResources(rt(c), c.user?.roles ?? [], c.user?.id ?? ''))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/:resourceType/:id',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(getResource(rt(c), rid(c), c.user?.roles ?? [], c.user?.id ?? ''))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/fhir/r4/:resourceType',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body()) as Record<string, unknown>;
        return json(ok(createResource(rt(c), body, c.user?.roles ?? [], c.user?.id ?? '')));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'PUT',
    path: '/fhir/r4/:resourceType/:id',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body()) as Record<string, unknown>;
        return json(ok(updateResource(rt(c), rid(c), body, c.user?.roles ?? [], c.user?.id ?? '')));
      } catch (e) { return mapError(e); }
    },
  },
];
