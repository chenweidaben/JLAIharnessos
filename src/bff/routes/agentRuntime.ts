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
import {
  type HumanTaskRecord,
} from '@/db/repositories/humanTaskRepo';
import {
  type WorkflowInstanceRecord,
} from '@/db/repositories/agentRuntimeRepo';
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

// ============================================================================
// v5.0试点扩展（M183-B）：DEMO_MODE 演示兜底
// ----------------------------------------------------------------------------
// 演示模式（DEMO_MODE=1/true）下无 PostgreSQL，聚合器会触发 DB 连接错误并被
// 本路由自身的 try/catch 转为 500（全局 demo 降级中间件因此看不到该异常）。
// 这里在进入聚合器之前显式返回结构化默认值：列表返回 []，单对象返回字段
// 完整的演示占位对象，保证 /agent-runtime 页面不再出现红色 500 报错。
// 版权所有（c）2026 杭州健澜科技有限公司
// ============================================================================

/** 是否演示模式（DEMO_MODE=1 / true） */
const isDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** v5.0试点扩展：构造一条演示运行实例（字段与 WorkflowInstanceRecord 对齐） */
function demoInstance(overrides: Partial<WorkflowInstanceRecord> = {}): WorkflowInstanceRecord {
  const now = new Date().toISOString();
  return {
    id: 'demo-instance-0001',
    instanceNo: 'INST-DEMO-0001',
    agentId: 'demo-agent',
    agentVersion: '1.0.0',
    workflowId: 'main',
    state: 'completed',
    triggerType: 'manual',
    traceId: 'demo-trace-0001',
    input: {},
    output: { demo: true, note: '（演示）DEMO_MODE 占位结果，未连接数据库，不能替代真实执行' },
    contextVars: {},
    errorCode: null,
    errorMessage: null,
    actorId: 'demo-admin',
    patientRef: null,
    tokensIn: 0,
    tokensOut: 0,
    startedAt: now,
    finishedAt: now,
    durationMs: 0,
    ...overrides,
  };
}

/** v5.0试点扩展：构造一条演示人工工单（字段与 HumanTaskRecord 对齐） */
function demoTask(overrides: Partial<HumanTaskRecord> = {}): HumanTaskRecord {
  const now = new Date().toISOString();
  return {
    id: 'demo-task-0001',
    taskNo: 'TASK-DEMO-0001',
    instanceId: 'demo-instance-0001',
    nodeId: 'human_review',
    title: '（演示）人工复核工单',
    instructions: '（演示）DEMO_MODE 占位工单，未连接数据库',
    assigneeRoles: ['admin'],
    assigneeUsers: [],
    formSchema: {},
    reviewData: null,
    status: 'pending',
    resolution: null,
    claimedBy: null,
    resolvedBy: null,
    dueAt: null,
    createdAt: now,
    resolvedAt: null,
    ...overrides,
  };
}

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
      // v5.0试点扩展：DEMO_MODE 下返回占位实例，不触发真实执行与落库
      if (isDemoMode) {
        return json(ok({ instance: demoInstance({ agentId: c.params.agentId }), nodes: [] }));
      }
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
      // v5.0试点扩展：DEMO_MODE 下实例列表返回空数组
      if (isDemoMode) return json(ok([]));
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
      // v5.0试点扩展：DEMO_MODE 下返回占位实例详情（不抛 404/500）
      if (isDemoMode) {
        return json(ok({
          instance: demoInstance({ id: c.params.instanceId, instanceNo: `INST-${c.params.instanceId}` }),
          nodes: [],
        }));
      }
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
      // v5.0试点扩展：DEMO_MODE 下返回已取消占位实例
      if (isDemoMode) {
        return json(ok({
          instance: demoInstance({
            id: c.params.instanceId,
            instanceNo: `INST-${c.params.instanceId}`,
            state: 'cancelled',
            finishedAt: new Date().toISOString(),
            errorCode: 'CANCELLED',
            errorMessage: '（演示）DEMO_MODE 占位取消，未连接数据库',
          }),
          nodes: [],
        }));
      }
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
      // v5.0试点扩展：DEMO_MODE 下工单列表返回空数组
      if (isDemoMode) return json(ok([]));
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
      // v5.0试点扩展：DEMO_MODE 下返回占位工单详情（不抛 404/500）
      if (isDemoMode) {
        return json(ok({ task: demoTask({ id: c.params.taskId, taskNo: `TASK-${c.params.taskId}` }), instance: null }));
      }
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
      // v5.0试点扩展：DEMO_MODE 下返回已认领占位工单
      if (isDemoMode) {
        return json(ok({
          task: demoTask({ id: c.params.taskId, taskNo: `TASK-${c.params.taskId}`, status: 'claimed', claimedBy: 'demo-admin' }),
          instance: null,
        }));
      }
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
      // v5.0试点扩展：DEMO_MODE 下返回已处理占位工单
      if (isDemoMode) {
        const now = new Date().toISOString();
        return json(ok({
          task: demoTask({
            id: c.params.taskId,
            taskNo: `TASK-${c.params.taskId}`,
            status: 'resolved',
            resolution: { approved: true, comment: '（演示）DEMO_MODE 占位审批，未连接数据库' },
            resolvedBy: 'demo-admin',
            resolvedAt: now,
          }),
          instance: null,
        }));
      }
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
