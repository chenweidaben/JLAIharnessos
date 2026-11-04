/**
 * 健澜AI原生医院操作系统OS - P1-6 院前住院管家路由
 *
 * 前缀 /api/v1/inpatient-concierge（避开 /admissions/* /admission-records /education/*）：
 *  - POST /pre-admission                              预入院
 *  - POST /authorization                              患者授权家属代办
 *  - POST /:preAdmissionId/check-in                   护士站报到
 *  - GET  /:preAdmissionId/checklist                  准备清单
 *  - POST /:preAdmissionId/checklist/:itemId/toggle   标记 done/skipped
 *  - POST /:preAdmissionId/education                  推送入院宣教
 *  - GET  /:preAdmissionId/education                  宣教列表
 *  - POST /:preAdmissionId/lab-radiology/slots        可预约时段
 *  - POST /:preAdmissionId/lab-radiology/book        预约检查
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  ConciergeError,
  createPreAdmission,
  checkIn,
  getChecklist,
  toggleItem,
  pushEducation,
  listEducation,
  listSlots,
  bookExam,
  grantAuthorization,
} from '../aggregators/inpatientConciergeAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof ConciergeError) {
    const s = (err as { status: number }).status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const pid = (c: Ctx): string => String(c.params?.preAdmissionId ?? '');
const itemId = (c: Ctx): string => String(c.params?.itemId ?? '');
const num = (b: Record<string, unknown>, k: string) => (b[k] === undefined ? undefined : Number(b[k]));

export const inpatientConciergeRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/inpatient-concierge/pre-admission',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createPreAdmission({
          patientId: String(b.patientId ?? ''),
          scheduledAdmissionAt: Number(b.scheduledAdmissionAt ?? 0),
          department: String(b.department ?? ''),
          expectedStayDays: Number(b.expectedStayDays ?? 0),
          roles: c.user?.roles ?? [], actorId: c.user?.id ?? '',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient-concierge/authorization',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(grantAuthorization({
          patientId: String(b.patientId ?? ''),
          familyMemberId: String(b.familyMemberId ?? ''),
          familyMemberName: String(b.familyMemberName ?? ''),
          scope: Array.isArray(b.scope) ? (b.scope as string[]) : [],
          roles: c.user?.roles ?? [], actorId: c.user?.id ?? '',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient-concierge/:preAdmissionId/check-in',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(checkIn(pid(c), c.user?.roles ?? [], Date.now())));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient-concierge/:preAdmissionId/checklist',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(getChecklist(pid(c)))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient-concierge/:preAdmissionId/checklist/:itemId/toggle',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(toggleItem(pid(c), itemId(c), b.state === 'skipped' ? 'skipped' : 'done', c.user?.roles ?? [], c.user?.id ?? '')));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient-concierge/:preAdmissionId/education',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(pushEducation({
          preAdmissionId: pid(c), topic: String(b.topic ?? ''), content: String(b.content ?? ''),
          pushChannel: b.pushChannel === 'wechat' || b.pushChannel === 'app' ? b.pushChannel : 'sms',
          roles: c.user?.roles ?? [], actorId: c.user?.id ?? '',
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient-concierge/:preAdmissionId/education',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try { return json(ok(listEducation(pid(c)))); }
      catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient-concierge/:preAdmissionId/lab-radiology/slots',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(listSlots(String(b.examType ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient-concierge/:preAdmissionId/lab-radiology/book',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(bookExam({
          preAdmissionId: pid(c), examType: String(b.examType ?? ''),
          slotTime: num(b, 'slotTime') ?? 0, department: String(b.department ?? ''),
          roles: c.user?.roles ?? [], actorId: c.user?.id ?? '',
        })));
      } catch (e) { return mapError(e); }
    },
  },
];
