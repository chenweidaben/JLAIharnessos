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
import {
  insertMessage,
  listBySession,
  markRead,
  toMessageView,
} from '@/db/repositories/medmuseMessageRepo';
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
  listSessions,
  getApprovalById,
} from '../agents/medmuseRepo';
import { TemplateFallbackProvider } from '../agents/modelProvider';
import { resolveApprovalTicket, expireStaleApprovals } from '../agents/sentinel';

/** 无 DB 演示模式：会话/消息走进程内内存兜底，不连 PostgreSQL、不抛错 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface DemoMedmuseSession {
  id: string;
  agentId: string;
  userId: string;
  title: string;
  createdAt: string;
  lastActiveAt: string;
}
const demoSessions = new Map<string, DemoMedmuseSession>();

function newDemoSessionId(): string {
  return `demo_sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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
        // DEMO：不连 PG，会话写入内存 Map
        if (isDemo) {
          const now = new Date().toISOString();
          const session: DemoMedmuseSession = {
            id: newDemoSessionId(),
            agentId: 'demo-agent',
            userId: c.user!.id,
            title: body?.title?.trim() || '新对话',
            createdAt: now,
            lastActiveAt: now,
          };
          demoSessions.set(session.id, session);
          return json(
            ok({
              session,
              agent: { id: 'demo-agent', roleCode, name: `${roleCode} 智能体（演示）` },
            }),
          );
        }
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
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
      // DEMO：不连 PG，直接返回内存会话列表（当前用户）
      if (isDemo) {
        const list = [...demoSessions.values()]
          .filter((s) => s.userId === c.user?.id)
          .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
        return json(ok(list));
      }
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
        // DEMO：不连 PG/模型，消息经 medmuseMessageRepo 内存落库，模板兜底回复
        if (isDemo) {
          const demoSession = demoSessions.get(c.params.sessionId);
          if (!demoSession || demoSession.userId !== c.user!.id) {
            return json(fail(ErrorCode.NOT_FOUND, '会话不存在或无权访问', c.traceId), 404);
          }
          await insertMessage({
            sessionId: demoSession.id,
            role: 'user',
            content,
            idempotencyKey: idemKey,
          });
          const provider = new TemplateFallbackProvider();
          const reply = await provider.chat([{ role: 'user', content }], []);
          await insertMessage({
            sessionId: demoSession.id,
            role: 'agent',
            content: reply.content,
            confidence: reply.confidence,
            disclaimer: reply.disclaimer,
          });
          demoSession.lastActiveAt = new Date().toISOString();
          return json(
            ok({
              reply: reply.content,
              confidence: reply.confidence,
              disclaimer: reply.disclaimer,
              newMessages: [
                { role: 'user' as const, content },
                { role: 'agent' as const, content: reply.content },
              ],
              pendingApproval: undefined,
              cached: false,
            }),
          );
        }
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
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
      try {
        // DEMO：不连 PG，直接读内存消息（camelCase 视图）
        if (isDemo) {
          const demoSession = demoSessions.get(c.params.sessionId);
          if (!demoSession || demoSession.userId !== c.user!.id) {
            return json(fail(ErrorCode.NOT_FOUND, '会话不存在或无权访问', c.traceId), 404);
          }
          const rows = await listBySession(c.params.sessionId);
          await markRead(c.params.sessionId);
          return json(ok(rows.map(toMessageView)));
        }
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
        const session = await getSessionById(c.params.sessionId);
        if (!session || session.user_id !== view.id) {
          return json(fail(ErrorCode.NOT_FOUND, '会话不存在或无权访问', c.traceId), 404);
        }
        // 历史从 clinical.medmuse_messages 读取（替代内存），读后批量标记已读
        const rows = await listBySession(c.params.sessionId);
        await markRead(c.params.sessionId);
        return json(ok(rows.map(toMessageView)));
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
