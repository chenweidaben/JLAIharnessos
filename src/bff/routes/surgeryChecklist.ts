/**
 * 健澜科技 jlmedaios - 手术安全核查表路由
 * GET  /api/v1/surgery/checklist?surgeryId=  按手术汇总四阶段清单
 * POST /api/v1/surgery/checklist             签署某一阶段（核查项 + 三方签名）
 * 仅要求登录（auth），不绑定额外权限码。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  listView,
  signView,
  SafetyChecklistError,
  type SignChecklistInput,
} from '../aggregators/surgeryChecklistAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof SafetyChecklistError) {
    const code =
      err.status === 401 ? ErrorCode.UNAUTHORIZED
        : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '手术安全核查表处理失败'), 500);
}

export const surgeryChecklistRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/surgery/checklist',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(await listView(c.user, c.query.get('surgeryId') ?? '')));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/surgery/checklist',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(await signView(c.user, (await c.body()) as SignChecklistInput)));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
