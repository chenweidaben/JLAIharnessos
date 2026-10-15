/**
 * 健澜科技 jlmedaios - 患者服务中心路由（M142-C · 预防保健与患者服务）
 *
 * 【预防保健与患者服务】患者诉求限时处理，不能石沉大海：
 *   POST /api/v1/patient/service/create   患者提交一条诉求（五类口径）；
 *   GET  /api/v1/patient/service/my?patientId=xxx   患者查看我的诉求进度；
 *   GET  /api/v1/admin/service/tickets?status=xxx  管理员工单看板
 *        （进入即扫描 48h 超时升级，返回最新台账 + 本次新升级件数）。
 *
 * 鉴权：未登录 401；患者端 create/my 需登录，管理员看板需 admin 角色。
 * 生产安全：出参 patientId 已脱敏（P0****23），不暴露患者级 PII；
 *   入参非法一律 400 结构化错误信封，不抛 500；
 *   落库 best-effort，断库不阻断主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  assignServiceTicket,
  createServiceTicket,
  listAllTickets,
  listMyTickets,
  persistTicket,
  persistTicketStatus,
  resolveServiceTicket,
  scanEscalations,
  submitSatisfaction,
} from '../aggregators/patientServiceAggregator';

/** 患者提交诉求请求体 */
interface CreateTicketBody {
  patientId?: unknown;
  type?: unknown;
  description?: unknown;
}

/** 管理员分派/处理请求体 */
interface AdminActionBody {
  ticketId?: unknown;
  handlerId?: unknown;
  handlerName?: unknown;
  resolution?: unknown;
  score?: unknown;
  comment?: unknown;
}

export const patientServiceRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/patient/service/create',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: CreateTicketBody;
      try {
        body = await c.body<CreateTicketBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      try {
        const ticket = createServiceTicket(body.patientId, body.type, body.description);
        // best-effort 落库持久化工单（断库降级，不阻断受理）
        await persistTicket(ticket);
        return json(ok({ ticket }, '诉求已受理，我们将在 48 小时内处理'), 201);
      } catch (err) {
        const message = err instanceof Error ? err.message : '诉求提交失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/patient/service/my',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const patientId = c.query.get('patientId') ?? '';
      try {
        const tickets = listMyTickets(patientId);
        return json(ok({ tickets }, '我的诉求已加载'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '诉求查询失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/admin/service/tickets',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      // 【预防保健与患者服务】进入看板即扫描 48h 超时升级，不能石沉大海
      const escalated = scanEscalations();
      for (const t of escalated) {
        await persistTicketStatus(t);
      }

      const status = c.query.get('status') ?? undefined;
      try {
        const tickets = listAllTickets(status);
        return json(
          ok(
            { tickets, escalatedCount: escalated.length, escalated },
            '工单看板已加载',
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '工单看板加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },

  /* ------------------------------------------------------------------ */
  /* 管理员处理动作：分派 / 闭环 / 患者满意度回访（工单流转闭环）          */
  /* ------------------------------------------------------------------ */

  {
    method: 'POST',
    path: '/api/v1/admin/service/assign',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      let body: AdminActionBody;
      try {
        body = await c.body<AdminActionBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }
      try {
        const ticket = assignServiceTicket(body.ticketId, body.handlerId, body.handlerName);
        await persistTicketStatus(ticket);
        return json(ok({ ticket }, '工单已分派'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '工单分派失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/service/resolve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      let body: AdminActionBody;
      try {
        body = await c.body<AdminActionBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }
      try {
        const ticket = resolveServiceTicket(body.ticketId, body.resolution);
        await persistTicketStatus(ticket);
        return json(ok({ ticket }, '工单已处理，请患者满意度回访'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '工单处理失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient/service/satisfaction',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: AdminActionBody;
      try {
        body = await c.body<AdminActionBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }
      try {
        const ticket = submitSatisfaction(body.ticketId, body.score, body.comment);
        await persistTicketStatus(ticket);
        return json(ok({ ticket }, '感谢您的满意度回访'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '满意度回访失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
