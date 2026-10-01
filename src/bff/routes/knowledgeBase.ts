/**
 * 健澜科技 jlmedaios - 知识库管理与 RAG 检索 BFF 路由（M4-A）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 知识库 CRUD、文档列表；
 *  - 文档摄入（解析 → 分块 → 嵌入 → 落库）；
 *  - 检索增强生成（RAG）混合检索，结果带来源（文档标题、章节、作者、出版者）。
 *
 * 严谨性：读写经 knowledge:read / knowledge:manage 权限；业务变更与审计哈希链
 * 同事务；统一错误信封（含 traceId）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  KnowledgeError,
  createKb,
  deleteKb,
  getKb,
  ingestDocument,
  listDocuments,
  listKbs,
  retrieve,
  updateKb,
} from '../aggregators/knowledgeAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof KnowledgeError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message, c.traceId), err.status);
  }
  // 非业务错误（如 DB 连接失败）：服务端记录完整错误（含 traceId），
  // 客户端仅返回通用文案 + traceId，不泄露堆栈/SQL/连接细节（等保三级）。
  console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(
    fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
    500,
  );
}

export const knowledgeBaseRoutes: RouteDef[] = [
  // ----- RAG 检索（置于 /:id 之前，避免路径歧义）-----
  {
    method: 'POST',
    path: '/api/v1/kb/retrieve',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:read');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<{ query: string; kbIds?: string[]; topK?: number }>();
        return json(ok(await retrieve(view, body.query, { kbIds: body.kbIds, topK: body.topK })));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 知识库列表 -----
  {
    method: 'GET',
    path: '/api/v1/kb',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:read');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await listKbs(view)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 新建知识库 -----
  {
    method: 'POST',
    path: '/api/v1/kb',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:manage');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<Parameters<typeof createKb>[1]>();
        return json(ok(await createKb(view, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 知识库详情 -----
  {
    method: 'GET',
    path: '/api/v1/kb/:id',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:read');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await getKb(view, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 更新知识库 -----
  {
    method: 'PUT',
    path: '/api/v1/kb/:id',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:manage');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<Parameters<typeof updateKb>[2]>();
        return json(ok(await updateKb(view, c.params.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 删除知识库 -----
  {
    method: 'DELETE',
    path: '/api/v1/kb/:id',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:manage');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        await deleteKb(view, c.params.id);
        return json(ok({ deleted: c.params.id }));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 文档列表 -----
  {
    method: 'GET',
    path: '/api/v1/kb/:id/documents',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:read');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await listDocuments(view, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 摄入文档 -----
  {
    method: 'POST',
    path: '/api/v1/kb/:id/documents',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'knowledge:manage');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<Parameters<typeof ingestDocument>[2]>();
        return json(ok(await ingestDocument(view, c.params.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
