/**
 * 健澜AI原生医院操作系统OS - P2-3 患者时间线路由（聚合视图）
 *
 * 前缀 /api/v1/patient-timeline（与既有静态 GET /all/visits/... 不冲突）：
 *  - GET  /:patientId/events?type=&from=&to=&limit=&offset=   聚合时间轴（倒序+过滤+分页）
 *  - GET  /:patientId/summary                                  byType 计数 + timeRange
 *  - POST /_seed                                               DEMO_MODE 测试桩灌样本
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  TimelineError,
  listEvents,
  summarize,
  seed,
} from '../aggregators/patientTimelineAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof TimelineError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const pid = (c: Ctx): string => String(c.params?.patientId ?? '');

function assertPatientScope(roles: string[], actorId: string, patientId: string): void {
  if (roles.includes('patient') && actorId !== patientId) {
    throw new TimelineError(403, `患者 ${actorId} 无权访问 ${patientId} 的时间线`);
  }
}

export const patientTimelineAggregatedRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/:patientId/events',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const p = pid(c);
        assertPatientScope(c.user?.roles ?? [], c.user?.id ?? '', p);
        return json(ok(listEvents({
          patientId: p,
          type: u.searchParams.get('type') ?? undefined,
          from: u.searchParams.get('from') ?? undefined,
          to: u.searchParams.get('to') ?? undefined,
          limit: u.searchParams.get('limit') ? Number(u.searchParams.get('limit')) : undefined,
          offset: u.searchParams.get('offset') ? Number(u.searchParams.get('offset')) : undefined,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/:patientId/summary',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const p = pid(c);
        assertPatientScope(c.user?.roles ?? [], c.user?.id ?? '', p);
        return json(ok(summarize(p)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/patient-timeline/_seed',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        if (process.env.DEMO_MODE !== '1') throw new TimelineError(403, '_seed 仅 DEMO_MODE 可用');
        const b = (await c.body()) as Record<string, unknown>;
        const p = String(b.patientId ?? '');
        const samples = Array.isArray(b.samples) ? (b.samples as Array<Record<string, unknown>>) : [];
        const out = seed(p, samples as Array<{ visitId: string; type: 'lab'|'imaging'|'medication'|'surgery'|'nursing'|'cds'|'encounter'; time: string; summary: string; detailRef: string }>);
        return json(ok({ seeded: out.length }));
      } catch (e) { return mapError(e); }
    },
  },
];
