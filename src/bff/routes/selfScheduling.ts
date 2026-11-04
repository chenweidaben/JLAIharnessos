/**
 * 健澜AI原生医院操作系统OS - P3-3 号源池 + 患者自助预约挂号路由
 *
 * 前缀 /api/v1/self-scheduling：
 *  - GET  /slots?departmentId=&date=&slotType=    查号源
 *  - POST /slots/_seed                            DEMO_MODE 灌号源
 *  - POST /bookings                               患者预约
 *  - GET  /bookings?patientId=                    我的预约
 *  - POST /bookings/:bookingId/cancel             取消释放
 *  - GET  /departments                            科室列表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  SlotError,
  listSlots, seedSlots, createBooking, listBookings, cancelBooking, listDepartments,
} from '../aggregators/selfSchedulingAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof SlotError) {
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
    throw new SlotError(403, `患者 ${actorId} 无权访问 ${targetPatientId} 的数据`);
  }
}

export const selfSchedulingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/self-scheduling/slots',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        return json(ok(listSlots({
          departmentId: u.searchParams.get('departmentId') ?? undefined,
          date: u.searchParams.get('date') ?? undefined,
          slotType: u.searchParams.get('slotType') ?? undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/self-scheduling/slots/_seed',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        if (process.env.DEMO_MODE !== '1') throw new SlotError(403, '_seed 仅 DEMO_MODE 可用');
        const b = (await c.body()) as Record<string, unknown>;
        const items = Array.isArray(b.items) ? (b.items as Array<Record<string, unknown>>) : [];
        const out = seedSlots(items as Array<{ departmentId: string; doctorId?: string; date: string; timeSlot: any; slotType: any; examType?: any; capacity: number }>);
        return json(ok({ seeded: out.length }));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/self-scheduling/bookings',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const roles = c.user?.roles ?? [];
        if (roles.includes('doctor') && !roles.includes('admin')) throw new SlotError(403, 'doctor 不能代患者预约');
        const b = (await c.body()) as Record<string, unknown>;
        const patientId = String(b.patientId ?? '');
        assertPatientScope(c, patientId);
        return json(ok(createBooking(patientId, String(b.slotId ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/self-scheduling/bookings',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = u.searchParams.get('patientId') ?? '';
        if (pid) assertPatientScope(c, pid);
        return json(ok(listBookings(pid || undefined)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/self-scheduling/bookings/:bookingId/cancel',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = u.searchParams.get('patientId') ?? '';
        if (pid) assertPatientScope(c, pid);
        return json(ok(cancelBooking(pid, String(c.params?.bookingId ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/self-scheduling/departments',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(listDepartments()));
      } catch (e) { return mapError(e); }
    },
  },
];
