/**
 * 健澜科技 jlmedaios - 低代码智能体搭建 BFF 路由（M4-B）
 *
 * 对接可视化画布，真实落 PostgreSQL：
 *  - 智能体列表 / 详情（含版本与草稿）；
 *  - 保存草稿（画布 -> 智能体包）；
 *  - 结构与语义校验；
 *  - 发布（SemVer 版本管理 + SHA-256 校验和）；
 *  - 删除。
 *
 * 严谨性：读写经 agent:build、发布经 agent:publish 权限；版本发布与审计哈希链
 * 同事务；统一错误信封（含 traceId）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import {
  type AgentRecord,
  type AgentVersionRecord,
} from '@/db/repositories/agentBuilderRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  AgentBuilderError,
  getBuilderAgent,
  listBuilderAgents,
  publishDraft,
  removeBuilderAgent,
  saveDraft,
  validateDraft,
} from '../aggregators/agentBuilderAggregator';

// ============================================================================
// v5.0试点扩展（M183-B）：DEMO_MODE 演示兜底
// ----------------------------------------------------------------------------
// 演示模式（DEMO_MODE=1/true）下无 PostgreSQL，聚合器会触发 DB 连接错误并被
// 本路由自身的 try/catch 转为 500（全局 demo 降级中间件因此看不到该异常）。
// 这里在进入聚合器之前显式返回结构化默认值：列表返回 []，单对象返回字段
// 完整的演示占位对象，保证 /agent-runtime 与搭建页面不再出现红色 500 报错。
// 版权所有（c）2026 杭州健澜科技有限公司
// ============================================================================

/** 是否演示模式（DEMO_MODE=1 / true） */
const isDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** v5.0试点扩展：演示校验结果（全部通过、无问题项） */
const demoValidation = { valid: true, issues: [] as Array<{ severity: string; code: string; message: string }> };

/** v5.0试点扩展：构造一条演示智能体（字段与 AgentRecord 对齐） */
function demoAgent(agentId: string): AgentRecord {
  const now = new Date().toISOString();
  return {
    id: `demo-${agentId}`,
    agentId,
    name: `（演示）${agentId}`,
    nameEn: null,
    category: 'clinical',
    riskLevel: 'low',
    description: '（演示）DEMO_MODE 占位智能体，未连接数据库',
    tags: ['demo'],
    allowedRoles: ['admin'],
    tools: [],
    knowledgeBases: [],
    builtin: false,
    status: 'disabled',
    currentVersion: '1.0.0',
    ownerId: 'demo-admin',
    createdAt: now,
    updatedAt: now,
  };
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof AgentBuilderError) {
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

export const agentBuilderRoutes: RouteDef[] = [
  // ----- 保存草稿（固定路径，置于 /:agentId 之前）-----
  {
    method: 'POST',
    path: '/api/v1/agent-builder/draft',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      // v5.0试点扩展：DEMO_MODE 下保存草稿仅返回占位结果，不写库
      if (isDemoMode) {
        return json(ok({ agentId: 'demo-agent', created: false, validation: demoValidation }));
      }
      try {
        const body = await c.body<unknown>();
        return json(ok(await saveDraft(view, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 智能体列表 -----
  {
    method: 'GET',
    path: '/api/v1/agent-builder/agents',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      // v5.0试点扩展：DEMO_MODE 下智能体列表返回空数组
      if (isDemoMode) return json(ok([]));
      try {
        return json(ok(await listBuilderAgents(view)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 智能体详情 -----
  {
    method: 'GET',
    path: '/api/v1/agent-builder/agents/:agentId',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      // v5.0试点扩展：DEMO_MODE 下返回占位智能体详情（不抛 404/500）
      if (isDemoMode) {
        return json(ok({ agent: demoAgent(c.params.agentId), versions: [] as AgentVersionRecord[], draft: null }));
      }
      try {
        return json(ok(await getBuilderAgent(view, c.params.agentId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 校验草稿 -----
  {
    method: 'POST',
    path: '/api/v1/agent-builder/agents/:agentId/validate',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      // v5.0试点扩展：DEMO_MODE 下校验返回占位通过结果
      if (isDemoMode) {
        return json(ok({ agentId: c.params.agentId, validation: demoValidation }));
      }
      try {
        return json(ok(await validateDraft(view, c.params.agentId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 发布 -----
  {
    method: 'POST',
    path: '/api/v1/agent-builder/agents/:agentId/publish',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:publish');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      // v5.0试点扩展：DEMO_MODE 下发布返回占位版本号，不写库
      if (isDemoMode) {
        return json(ok({ agentId: c.params.agentId, version: '1.0.0', checksum: 'demo-checksum' }));
      }
      try {
        const body = await c.body<{ bump?: 'major' | 'minor' | 'patch'; changelog?: string }>();
        return json(ok(await publishDraft(view, c.params.agentId, body ?? {})));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 删除 -----
  {
    method: 'DELETE',
    path: '/api/v1/agent-builder/agents/:agentId',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      // v5.0试点扩展：DEMO_MODE 下删除返回占位结果，不写库
      if (isDemoMode) {
        return json(ok({ deleted: c.params.agentId }));
      }
      try {
        await removeBuilderAgent(view, c.params.agentId);
        return json(ok({ deleted: c.params.agentId }));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
