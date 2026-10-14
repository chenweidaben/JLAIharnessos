/**
 * MEDMUSE BFF 路由 - 会话/对话/审批/agent 列表。
 *
 * 医疗安全：
 *   - 所有 POST 必须携带 Idempotency-Key header，缺失返回 400；
 *   - critical 级审批禁止申请人自己批准自己；
 *   - chat 响应统一带 confidence / disclaimer。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { runAgentTurn } from '../agents/agentEngine';
import {
  createSession,
  getAgentByRole,
  getAgentById,
  getSessionById,
  listAgents,
  listApprovals,
  listMessages,
  listSessions,
  getApprovalById,
} from '../agents/medmuseRepo';
import { resolveApprovalTicket, expireStaleApprovals } from '../agents/sentinel';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown, c: Ctx): Response {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === 'SESSION_NOT_FOUND') {
    return json(fail(ErrorCode.NOT_FOUND, '会话不存在或无权访问', c.traceId), 404);
  }
  if (msg === 'SELF_APPROVAL_FORBIDDEN') {
    return json(fail(ErrorCode.FORBIDDEN, 'critical 级审批不允许申请人自己批准自己', c.traceId), 403);
  }
  console.error(`[medmuse error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId), 500);
}

function getIdempotencyKey(c: Ctx): string | null {
  return c.req.headers.get('idempotency-key')?.trim() || null;
}

export const medmuseRoutes: RouteDef[] = [
  // ----- 创建会话 -----
  {
    method: 'POST',
    path: '/api/v1/medmuse/sessions',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      const idemKey = getIdempotencyKey(c);
      if (!idemKey) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 Idempotency-Key 请求头', c.traceId), 400);
      }
      try {
        const body = await c.body<{ roleCode?: string; patientId?: string | null; title?: string }>();
        const roleCode = body?.roleCode;
        if (!roleCode) {
          return json(fail(ErrorCode.BAD_REQUEST, 'roleCode 不能为空', c.traceId), 400);
        }
        const agent = await getAgentByRole(roleCode);
        if (!agent) {
          return json(fail(ErrorCode.NOT_FOUND, `未找到岗位 agent: ${roleCode}`, c.traceId), 404);
        }
        const session = await createSession({
          agentId: agent.id,
          userId: view.id,
          patientId: body?.patientId ?? null,
          title: body?.title ?? undefined,
        });
        return json(ok({ session, agent: { id: agent.id, roleCode: agent.role_code, name: agent.name } }));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 我的会话列表 -----
  {
    method: 'GET',
    path: '/api/v1/medmuse/sessions',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await listSessions(view.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 发消息 -----
  {
    method: 'POST',
    path: '/api/v1/medmuse/sessions/:sessionId/chat',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      const idemKey = getIdempotencyKey(c);
      if (!idemKey) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 Idempotency-Key 请求头', c.traceId), 400);
      }
      try {
        const body = await c.body<{ content?: string; confirmed?: boolean }>();
        const content = (body?.content ?? '').trim();
        if (!content) {
          return json(fail(ErrorCode.BAD_REQUEST, 'content 不能为空', c.traceId), 400);
        }
        const session = await getSessionById(c.params.sessionId);
        if (!session || session.user_id !== view.id) {
          return json(fail(ErrorCode.NOT_FOUND, '会话不存在或无权访问', c.traceId), 404);
        }
        const agent = await getAgentById(session.agent_id);
        if (!agent) {
          return json(fail(ErrorCode.NOT_FOUND, '会话关联的 agent 不存在', c.traceId), 404);
        }
        const result = await runAgentTurn({
          agent,
          userId: view.id,
          sessionId: c.params.sessionId,
          userMessage: content,
          idempotencyKey: idemKey,
          confirmed: body?.confirmed ?? false,
        });
        return json(ok(result));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 历史消息 -----
  {
    method: 'GET',
    path: '/api/v1/medmuse/sessions/:sessionId/messages',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const session = await getSessionById(c.params.sessionId);
        if (!session || session.user_id !== view.id) {
          return json(fail(ErrorCode.NOT_FOUND, '会话不存在或无权访问', c.traceId), 404);
        }
        return json(ok(await listMessages(c.params.sessionId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 审批列表（先清扫过期工单） -----
  {
    method: 'GET',
    path: '/api/v1/medmuse/approvals',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        await expireStaleApprovals();
        const url = new URL(c.req.url);
        const status = (url.searchParams.get('status') ?? 'pending') as
          | 'pending' | 'approved' | 'rejected' | 'expired';
        return json(ok(await listApprovals({ status })));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 审批决议 -----
  {
    method: 'POST',
    path: '/api/v1/medmuse/approvals/:approvalId/decide',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:chat');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      const idemKey = getIdempotencyKey(c);
      if (!idemKey) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 Idempotency-Key 请求头', c.traceId), 400);
      }
      try {
        const body = await c.body<{ approved?: boolean; comment?: string }>();
        if (typeof body?.approved !== 'boolean') {
          return json(fail(ErrorCode.BAD_REQUEST, 'approved 必须为布尔值', c.traceId), 400);
        }
        const existing = await getApprovalById(c.params.approvalId);
        if (!existing) {
          return json(fail(ErrorCode.NOT_FOUND, '审批单不存在', c.traceId), 404);
        }
        const updated = await resolveApprovalTicket({
          approvalId: c.params.approvalId,
          approved: body.approved,
          approvedBy: view.id,
          requesterId: existing.requested_by ?? undefined,
          riskLevel: existing.risk_level,
          rejectionReason: body.comment,
        });
        if (!updated) {
          return json(fail(ErrorCode.NOT_FOUND, '审批单不存在或已处理', c.traceId), 404);
        }
        return json(ok(updated));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 角色 agent 列表（管理员） -----
  {
    method: 'GET',
    path: '/api/v1/medmuse/agents',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'medmuse:admin');
      if (denied) return denied;
      try {
        return json(ok(await listAgents()));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
