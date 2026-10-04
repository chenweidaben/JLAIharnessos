/* ============================================================================
 * 健澜科技杠OS - 会话管理 BFF 路由（M7-F）
 *
 * 在线会话审计与强制下线：
 *  - GET  /api/v1/admin/sessions        列出活跃会话（可按 user_id 过滤）；
 *  - POST /api/v1/admin/sessions/revoke 按 jti 或 user_id 吊销（强制下线）。
 *
 * 仅授予 session:manage（admin）；统一错误信封；强制下线留审计。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { recordChainAudit } from '@/db/repositories/auditChainRepo';
import {
  listActiveSessions,
  revokeByJti,
  revokeForUser,
} from '@/db/repositories/sessionRepo';
import { requirePermissionCode } from '../middleware/auth';
import { markSessionRevoked } from '../middleware/sessionGuard';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

function present(s: {
  jti: string;
  userId: string;
  issuedAt: string;
  accessExpiresAt: string;
  ip: string | null;
  userAgent: string | null;
}) {
  return {
    jti: s.jti,
    userId: s.userId,
    issuedAt: s.issuedAt,
    accessExpiresAt: s.accessExpiresAt,
    ip: s.ip,
    userAgent: s.userAgent,
  };
}

export const sessionAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/sessions',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'session:manage');
      if (denied) return denied;
      try {
        const userId = c.query.get('user_id')?.trim() || null;
        const sessions = await listActiveSessions(userId);
        return json(ok({ total: sessions.length, items: sessions.map(present) }));
      } catch (err) {
        console.error(`[bff error] GET /admin/sessions [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
          500,
        );
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/sessions/revoke',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'session:manage');
      if (denied) return denied;
      try {
        const body = await c.body<{ jti?: string; userId?: string }>();
        const jti = body.jti?.trim() || '';
        const userId = body.userId?.trim() || '';

        if (jti) {
          const revoked = await revokeByJti(jti, 'admin_force');
          if (!revoked) {
            return json(fail(ErrorCode.NOT_FOUND, '未找到该活跃会话', c.traceId), 404);
          }
          markSessionRevoked(jti);
          await recordChainAudit({
            actorId: c.user!.id,
            actorName: c.user!.name,
            action: 'session.revoke',
            resourceType: 'user_session',
            resourceId: jti,
            result: 'success',
            riskLevel: 'medium',
          });
          return json(ok({ revoked: 1 }));
        }

        if (userId) {
          // 先取将被吊销的会话 jti（排除管理员当前会话），用于缓存即时失效
          const targets = await listActiveSessions(userId);
          const targetJtis = targets.map((s) => s.jti).filter((j) => j !== c.user!.jti);
          const count = await revokeForUser(userId, 'admin_force', c.user!.jti ?? null);
          for (const j of targetJtis) markSessionRevoked(j);
          await recordChainAudit({
            actorId: c.user!.id,
            actorName: c.user!.name,
            action: 'session.force_user_offline',
            resourceType: 'user',
            resourceId: userId,
            result: 'success',
            riskLevel: 'high',
          });
          return json(ok({ revoked: count }));
        }

        return json(fail(ErrorCode.BAD_REQUEST, '需要提供 jti 或 userId', c.traceId), 400);
      } catch (err) {
        console.error(`[bff error] POST /admin/sessions/revoke [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
          500,
        );
      }
    },
  },
];
