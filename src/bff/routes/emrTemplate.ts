/**
 * 健澜科技 jlmedaios - 电子病历模板管理 BFF 路由（EMR Template）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - GET    /api/v1/emr-template          模板列表（?category= 按分类筛选）
 *  - POST   /api/v1/emr-template            新建模板
 *  - PUT    /api/v1/emr-template/:id        更新模板
 *  - DELETE /api/v1/emr-template/:id        删除模板
 *
 * 严谨性：仅要求登录（auth），不引入独立权限码；业务错误统一信封（含 traceId）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  EmrTemplateError,
  createView,
  deleteView,
  listView,
  updateView,
} from '../aggregators/emrTemplateAggregator';

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof EmrTemplateError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message, c.traceId), err.status);
  }
  // 非业务错误（如 DB 连接失败）：服务端记录完整错误，客户端仅通用文案 + traceId。
  console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(
    fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
    500,
  );
}

export const emrTemplateRoutes: RouteDef[] = [
  // ----- 模板列表（置于 /:id 之前，避免路径歧义）-----
  {
    method: 'GET',
    path: '/api/v1/emr-template',
    auth: true,
    handle: async (c) => {
      try {
        const category = c.query.get('category') || null;
        return json(ok(await listView(category)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 新建模板 -----
  {
    method: 'POST',
    path: '/api/v1/emr-template',
    auth: true,
    handle: async (c) => {
      try {
        const body = await c.body<{
          name: string;
          category?: string;
          content?: string;
        }>();
        const actorId = c.user?.id ?? null;
        return json(ok(await createView(actorId, body ?? {})), 201);
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 更新模板 -----
  {
    method: 'PUT',
    path: '/api/v1/emr-template/:id',
    auth: true,
    handle: async (c) => {
      try {
        const body = await c.body<{
          name?: string;
          category?: string;
          content?: string;
        }>();
        return json(ok(await updateView(c.params.id, body ?? {})));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 删除模板 -----
  {
    method: 'DELETE',
    path: '/api/v1/emr-template/:id',
    auth: true,
    handle: async (c) => {
      try {
        return json(ok(await deleteView(c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
