/**
 * 健澜科技 jlmedaios - 智能体运行时 BFF 路由（M4-C）
 *
 * 触发已发布智能体执行，并查询运行实例 / 节点记录 / 结果回放：
 *  - POST /agent-runtime/agents/:agentId/run     触发执行
 *  - GET  /agent-runtime/instances              实例列表（可按 agentId/state 过滤）
 *  - GET  /agent-runtime/instances/:id          实例详情（含节点记录）
 *  - POST /agent-runtime/instances/:id/cancel   取消运行中实例
 *
 * 严谨性：执行/读取经 agent:build 权限；实例终态、节点记录与审计哈希链同事务；
 * 统一错误信封（含 traceId）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  AgentRuntimeError,
  cancelAgentRun,
  getAgentRun,
  listAgentRuns,
  startAgentRun,
  listMyHumanTasks,
  getHumanTask,
  claimMyHumanTask,
  resolveMyHumanTask,
} from '../aggregators/agentRuntimeAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof AgentRuntimeError) {
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
  return json(fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId), 500);
}

export const agentRuntimeRoutes: RouteDef[] = [
  // ----- 触发执行 -----
  {
    method: 'POST',
    path: '/api/v1/agent-runtime/agents/:agentId/run',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<{
          version?: string;
          input?: Record<string, unknown>;
          timeoutMs?: number;
          patientRef?: string;
        }>();
        return json(ok(await startAgentRun(view, c.params.agentId, body ?? {})));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 实例列表 -----
  {
    method: 'GET',
    path: '/api/v1/agent-runtime/instances',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const url = new URL(c.req.url);
        const agentId = url.searchParams.get('agentId') ?? undefined;
        const state = url.searchParams.get('state') ?? undefined;
        const limit = Number(url.searchParams.get('limit') ?? 100);
        return json(ok(await listAgentRuns(view, { agentId, state, limit })));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 实例详情 -----
  {
    method: 'GET',
    path: '/api/v1/agent-runtime/instances/:instanceId',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await getAgentRun(view, c.params.instanceId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 取消 -----
  {
    method: 'POST',
    path: '/api/v1/agent-runtime/instances/:instanceId/cancel',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<{ reason?: string }>();
        return json(ok(await cancelAgentRun(view, c.params.instanceId, body?.reason)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 我的人工工单列表（M4-D） -----
  {
    method: 'GET',
    path: '/api/v1/human-tasks',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const url = new URL(c.req.url);
        const status = url.searchParams.get('status') ?? 'pending';
        const limit = Number(url.searchParams.get('limit') ?? 100);
        return json(ok(await listMyHumanTasks(view, { status, limit })));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 工单详情 -----
  {
    method: 'GET',
    path: '/api/v1/human-tasks/:taskId',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await getHumanTask(view, c.params.taskId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 认领工单 -----
  {
    method: 'POST',
    path: '/api/v1/human-tasks/:taskId/claim',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await claimMyHumanTask(view, c.params.taskId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 处理工单（批准/驳回） -----
  {
    method: 'POST',
    path: '/api/v1/human-tasks/:taskId/resolve',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'agent:build');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<{ approved: boolean; comment?: string; formData?: Record<string, unknown> }>();
        const approved = body?.approved;
        if (typeof approved !== 'boolean') {
          return json(fail(ErrorCode.BAD_REQUEST, 'approved 必须为布尔值', c.traceId), 400);
        }
        return json(ok(await resolveMyHumanTask(view, c.params.taskId, {
          approved,
          comment: body?.comment,
          formData: body?.formData,
        })));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
