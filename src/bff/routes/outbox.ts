/* ============================================================================
 * 健澜科技杠OS - 事务性发件箱管理 BFF 路由（M7-D）
 *
 * 死信队列（Dead-Letter）运维：
 *  - GET  /api/v1/outbox/dead-letters  列出死信（分页）；
 *  - POST /api/v1/outbox/requeue/:id   修复后重投（dead -> pending）。
 *
 * 仅授予 outbox:manage（admin）；统一错误信封；写操作留审计。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { recordChainAudit } from '@/db/repositories/auditChainRepo';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  listDeadLetters,
  requeueDeadLetter,
} from '../../db/repositories/outboxRepo';

export const outboxRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/outbox/dead-letters',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'outbox:manage');
      if (denied) return denied;
      try {
        const limit = c.query.get('limit') ? Number(c.query.get('limit')) : 50;
        const offset = c.query.get('offset') ? Number(c.query.get('offset')) : 0;
        const { items, total } = await listDeadLetters(limit, offset);
        return json(
          ok({
            total,
            items: items.map((e) => ({
              id: e.id,
              eventId: e.eventId,
              eventType: e.eventType,
              aggregateType: e.aggregateType,
              aggregateId: e.aggregateId,
              attempts: e.attempts,
              lastError: e.lastError,
              deadAt: e.deadAt,
              createdAt: e.createdAt,
            })),
          }),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '查询死信失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/outbox/requeue/:id',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'outbox:manage');
      if (denied) return denied;
      try {
        const id = Number(c.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return json(fail(ErrorCode.BAD_REQUEST, '非法的事件 id', c.traceId), 400);
        }
        const requeued = await requeueDeadLetter(id);
        if (!requeued) {
          return json(fail(ErrorCode.NOT_FOUND, '未找到该死信（可能已重投或非 dead）', c.traceId), 404);
        }
        await recordChainAudit({
          actorId: c.user!.id,
          actorName: c.user!.name,
          action: 'outbox.requeue',
          resourceType: 'event_outbox',
          resourceId: String(id),
          result: 'success',
        });
        return json(ok({ id, requeued: true }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '死信重投失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
