/**
 * 健澜AI原生医院操作系统OS - P3-4 报告推送 + 满意度闭环工单路由
 *
 * 前缀 /api/v1/engagement：
 *  - POST /reports                  发布报告（自动 pushed，异常加 sms）
 *  - GET  /reports?patientId=        患者查自己报告
 *  - POST /reports/:reportId/read   标记已读（幂等）
 *  - POST /tickets                  患者建工单
 *  - GET  /tickets?patientId=       患者查自己工单
 *  - POST /tickets/:ticketId/comment 追加评论
 *  - POST /tickets/:ticketId/status admin 更新状态
 *  - POST /_seed                    DEMO_MODE 灌样本（含低分自动工单）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  EngagementError,
  publishReport, listReports, markReportRead,
  createTicket, listTickets, addComment, updateTicketStatus, autoCreateLowSatisfactionTicket,
} from '../aggregators/engagementAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof EngagementError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

function assertPatientScope(c: Ctx, targetPatientId: string): void {
  const roles = c.user?.roles ?? [];
  const actorId = c.user?.id ?? '';
  if (roles.includes('patient') && actorId !== targetPatientId) {
    throw new EngagementError(403, `患者 ${actorId} 无权访问 ${targetPatientId} 的数据`);
  }
}

export const engagementRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/engagement/reports',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(publishReport({
          patientId: String(b.patientId ?? ''), visitId: String(b.visitId ?? ''),
          type: b.type, title: String(b.title ?? ''), result: String(b.result ?? ''),
          isAbnormal: Boolean(b.isAbnormal),
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/engagement/reports',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = u.searchParams.get('patientId') ?? '';
        assertPatientScope(c, pid);
        return json(ok(listReports(pid)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/engagement/reports/:reportId/read',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = u.searchParams.get('patientId') ?? '';
        assertPatientScope(c, pid);
        return json(ok(markReportRead(pid, String(c.params?.reportId ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/engagement/tickets',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const patientId = String(b.patientId ?? '');
        assertPatientScope(c, patientId);
        return json(ok(createTicket({
          patientId,
          source: b.source, relatedSurveyId: b.relatedSurveyId === undefined ? undefined : String(b.relatedSurveyId),
          subject: String(b.subject ?? ''), description: String(b.description ?? ''),
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/engagement/tickets',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = u.searchParams.get('patientId') ?? '';
        assertPatientScope(c, pid);
        return json(ok(listTickets(pid)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/engagement/tickets/:ticketId/comment',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const roles = c.user?.roles ?? [];
        // 患者只能 comment 自己的工单
        if (roles.includes('patient')) {
          const t = listTickets(c.user?.id ?? '').find((x) => x.ticketId === String(c.params?.ticketId ?? ''));
          if (!t) throw new EngagementError(403, '只能评论自己的工单');
        }
        return json(ok(addComment(
          String(c.params?.ticketId ?? ''),
          c.user?.id ?? '', roles.join(','),
          String(b.content ?? ''),
        )));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/engagement/tickets/:ticketId/status',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const roles = c.user?.roles ?? [];
        if (!roles.includes('admin')) throw new EngagementError(403, '更新工单状态需 admin');
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(updateTicketStatus(
          String(c.params?.ticketId ?? ''),
          String(b.status ?? ''),
          b.comment === undefined ? undefined : String(b.comment),
        )));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/engagement/_seed',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        if (process.env.DEMO_MODE !== '1') throw new EngagementError(403, '_seed 仅 DEMO_MODE 可用');
        const b = (await c.body()) as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        if (Array.isArray(b.reports)) {
          out.reports = (b.reports as Array<Record<string, unknown>>).map((r) => publishReport({
            patientId: String(r.patientId ?? ''), visitId: String(r.visitId ?? ''),
            type: r.type, title: String(r.title ?? ''), result: String(r.result ?? ''), isAbnormal: Boolean(r.isAbnormal),
          }));
        }
        if (Array.isArray(b.lowSatisfaction)) {
          out.tickets = (b.lowSatisfaction as Array<Record<string, unknown>>).map((x) => autoCreateLowSatisfactionTicket(
            String(x.patientId ?? ''), String(x.surveyId ?? ''), String(x.comment ?? ''),
          ));
        }
        return json(ok(out));
      } catch (e) { return mapError(e); }
    },
  },
];
