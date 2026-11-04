/**
 * 健澜AI原生医院操作系统OS - P0-6 临床电子签名路由（SM2/SM3 + TSA）
 *
 * 路径前缀 /api/v1/e-sign/clinical（避开既有 /e-sign/log、/esignature/sign）：
 *  - POST /objects                      请求签名 {objectType, objectId, content}
 *  - POST /objects/:signId/verify       验签（可附 content 做篡改检测）
 *  - GET  /objects/:objectType/:objectId 查某对象签名列表
 *
 * 全 auth:true；角色权限 doctor→emr/order、nurse→nursing-record；越权 403 code=40300。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  ClinicalSignatureError,
  signClinicalObject,
  verifyClinicalObject,
  listObjectSignatures,
} from '../aggregators/clinicalSignatureAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof ClinicalSignatureError) {
    const code =
      err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const clinicalSignatureRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/e-sign/clinical/objects',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const rec = signClinicalObject({
          objectType: String(b.objectType ?? ''),
          objectId: String(b.objectId ?? ''),
          content: String(b.content ?? ''),
          roles: c.user?.roles ?? [],
          signedBy: c.user?.id ?? 'unknown',
          signedByName: c.user?.name,
        });
        return json(ok(rec));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/e-sign/clinical/objects/:signId/verify',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const result = verifyClinicalObject({
          signId: c.params.signId,
          content: b.content ? String(b.content) : undefined,
        });
        if (!result.valid) {
          return json(fail(ErrorCode.BAD_REQUEST, result.reason ?? '验签失败'), 400);
        }
        return json(ok(result));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/e-sign/clinical/objects/:objectType/:objectId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const list = listObjectSignatures(c.params.objectType, c.params.objectId);
        return json(ok(list));
      } catch (e) { return mapError(e); }
    },
  },
];
