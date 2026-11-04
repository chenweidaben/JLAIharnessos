/**
 * 健澜AI原生医院操作系统OS - P3-1 患者互联网+服务门户路由
 *
 * 前缀 /api/v1/patient-portal（与既有 /api/v1/portal/* 不冲突）：
 *  - GET  /reports?type=&from=&to=                 我的报告
 *  - POST /reports/:reportId/read                  标记已读（幂等）
 *  - POST /consult-bookings                        预约图文咨询
 *  - GET  /consult-bookings                        我的预约
 *  - POST /consult-bookings/:bookingId/cancel     取消
 *  - POST /satisfaction                            提交满意度
 *  - GET  /reminders                               我的提醒
 *  - POST /reminders/:reminderId/read             提醒已读
 *  - GET  /payments                                缴费记录
 *  - POST /_seed                                   DEMO_MODE 灌样本
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  PortalError,
  listReports, markReportRead,
  createBooking, listBookings, cancelBooking,
  submitSatisfaction,
  listReminders, markReminderRead,
  listPayments, listAdminNotifs,
  seed,
} from '../aggregators/patientPortalV2Aggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof PortalError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

/** patient 角色必须以自己身份访问；doctor/admin 放行 */
function assertPatientScope(c: Ctx, targetPatientId: string): string {
  const roles = c.user?.roles ?? [];
  const actorId = c.user?.id ?? '';
  if (roles.includes('patient') && actorId !== targetPatientId) {
    throw new PortalError(403, `患者 ${actorId} 无权访问 ${targetPatientId} 的数据`);
  }
  // 没有 patientId 入参时，patient 角色默认以自己身份
  if (!targetPatientId && roles.includes('patient')) return actorId;
  return targetPatientId;
}

export const patientPortalV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient-portal/reports',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = assertPatientScope(c, u.searchParams.get('patientId') ?? '');
        return json(ok(listReports(pid, {
          type: u.searchParams.get('type') ?? undefined,
          from: u.searchParams.get('from') ?? undefined,
          to: u.searchParams.get('to') ?? undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient-portal/reports/:reportId/read',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = assertPatientScope(c, u.searchParams.get('patientId') ?? '');
        return json(ok(markReportRead(pid, String(c.params?.reportId ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient-portal/consult-bookings',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const patientId = assertPatientScope(c, String(b.patientId ?? ''));
        return json(ok(createBooking({
          patientId, doctorId: String(b.doctorId ?? ''), departmentId: String(b.departmentId ?? ''),
          scheduledAt: String(b.scheduledAt ?? ''), note: b.note === undefined ? undefined : String(b.note),
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/patient-portal/consult-bookings',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = assertPatientScope(c, u.searchParams.get('patientId') ?? '');
        return json(ok(listBookings(pid)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient-portal/consult-bookings/:bookingId/cancel',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = assertPatientScope(c, u.searchParams.get('patientId') ?? '');
        return json(ok(cancelBooking(pid, String(c.params?.bookingId ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient-portal/satisfaction',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const patientId = assertPatientScope(c, String(b.patientId ?? ''));
        return json(ok(submitSatisfaction({
          patientId, visitId: String(b.visitId ?? ''), doctorId: String(b.doctorId ?? ''),
          score: Number(b.score ?? 0), comment: b.comment === undefined ? undefined : String(b.comment),
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/patient-portal/reminders',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = assertPatientScope(c, u.searchParams.get('patientId') ?? '');
        return json(ok(listReminders(pid)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient-portal/reminders/:reminderId/read',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = assertPatientScope(c, u.searchParams.get('patientId') ?? '');
        return json(ok(markReminderRead(pid, String(c.params?.reminderId ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/patient-portal/payments',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = assertPatientScope(c, u.searchParams.get('patientId') ?? '');
        return json(ok(listPayments(pid)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient-portal/_seed',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        if (process.env.DEMO_MODE !== '1') throw new PortalError(403, '_seed 仅 DEMO_MODE 可用');
        const b = (await c.body()) as Record<string, unknown>;
        const pid = String(b.patientId ?? '');
        return json(ok(seed(pid, {
          reports: Array.isArray(b.reports) ? (b.reports as never[]) : [],
          payments: Array.isArray(b.payments) ? (b.payments as never[]) : [],
          reminders: Array.isArray(b.reminders) ? (b.reminders as never[]) : [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
];
