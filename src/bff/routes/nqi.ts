/**
 * 健澜AI原生医院操作系统OS - P2-4 护理 NQI 敏感指标路由
 *
 * 前缀 /api/v1/nqi：
 *  - POST /events/fall              跌倒
 *  - POST /events/pressure-ulcer     压疮
 *  - POST /events/tube-displacement 管路滑脱
 *  - POST /events/restraint         约束开始
 *  - POST /events/restraint/:eventId/assess   每日评估
 *  - POST /events/restraint/:eventId/release 解除
 *  - GET  /events?departmentId=&type=&from=&to=  列表
 *  - GET  /dashboard?month=YYYY-MM&departmentId= 指标看板
 *  - POST /staffing                 床护比录入
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  NqiError,
  reportFall, reportPressureUlcer, reportTubeDisplacement, reportRestraint,
  assessRestraint, releaseRestraint, listEvents, upsertStaffing, dashboard,
} from '../aggregators/nqiAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof NqiError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

function requireNurse(c: Ctx): void {
  const roles = c.user?.roles ?? [];
  if (roles.includes('doctor') && !roles.includes('admin')) throw new NqiError(403, 'doctor 不能上报 NQI 事件');
  if (!roles.some((r) => r === 'nurse' || r === 'admin')) throw new NqiError(403, '需 nurse/admin 上报');
}

const eid = (c: Ctx): string => String(c.params?.eventId ?? '');

export const nqiRoutes: RouteDef[] = [
  {
    method: 'POST', path: '/api/v1/nqi/events/fall', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        requireNurse(c);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reportFall({ ...b as any, reportedByNurseId: c.user?.id ?? '' })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nqi/events/pressure-ulcer', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        requireNurse(c);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reportPressureUlcer({ ...b as any, reportedByNurseId: c.user?.id ?? '' })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nqi/events/tube-displacement', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        requireNurse(c);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reportTubeDisplacement({ ...b as any, reportedByNurseId: c.user?.id ?? '' })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nqi/events/restraint', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        requireNurse(c);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(reportRestraint({ ...b as any, reportedByNurseId: c.user?.id ?? '' })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nqi/events/restraint/:eventId/assess', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        requireNurse(c);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(assessRestraint(eid(c), String(b.at ?? ''), String(b.rationale ?? ''), Array.isArray(b.alternativesTried) ? (b.alternativesTried as string[]) : [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nqi/events/restraint/:eventId/release', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        requireNurse(c);
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(releaseRestraint(eid(c), String(b.removedAt ?? ''))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET', path: '/api/v1/nqi/events', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        return json(ok(listEvents({
          departmentId: u.searchParams.get('departmentId') ?? undefined,
          type: u.searchParams.get('type') ?? undefined,
          from: u.searchParams.get('from') ?? undefined,
          to: u.searchParams.get('to') ?? undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET', path: '/api/v1/nqi/dashboard', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const month = u.searchParams.get('month') ?? '';
        const dep = u.searchParams.get('departmentId') ?? undefined;
        return json(ok(dashboard(month, dep)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nqi/staffing', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(upsertStaffing({
          departmentId: String(b.departmentId ?? ''), date: String(b.date ?? ''),
          beds: Number(b.beds ?? 0), nurses: Number(b.nurses ?? 0), inpatients: Number(b.inpatients ?? 0),
        })));
      } catch (e) { return mapError(e); }
    },
  },
];
