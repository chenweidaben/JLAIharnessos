/**
 * 健澜AI原生医院操作系统OS - P5-1 医疗质量管理指标闭环 路由
 *
 * 前缀 /api/v1/quality/dashboard：
 *  - GET /overview?departmentId=&from=&to=
 *  - GET /by-doctor?departmentId=&from=&to=
 *  - GET /trend?metric=&from=&to=&departmentId=
 *  - POST /_seed（DEMO_MODE）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  METRIC_WHITELIST, byDoctor, computeOverview, seed, trend, type MetricKey,
} from '../aggregators/qualityDashboardAggregator.js';

function isAdmin(c: Ctx): boolean { return (c.user?.roles ?? []).includes('admin'); }
function isDoctor(c: Ctx): boolean { return (c.user?.roles ?? []).includes('doctor'); }
function isNurse(c: Ctx): boolean { return (c.user?.roles ?? []).includes('nurse'); }

function parseWindow(c: Ctx) {
  const q = new URL(c.req.url).searchParams;
  const from = q.get('from') ?? undefined;
  const to = q.get('to') ?? undefined;
  const departmentId = q.get('departmentId') ?? undefined;
  if (from && Number.isNaN(new Date(from).getTime())) return { err: 'from 不是合法 ISO' };
  if (to && Number.isNaN(new Date(to).getTime())) return { err: 'to 不是合法 ISO' };
  return { from, to, departmentId };
}

/** doctor 不允许显式传 departmentId（视为跨科室）；nurse 只看护理指标 */
function guardDepartment(c: Ctx, departmentId: string | undefined): Response | null {
  if (isAdmin(c)) return null;
  if (isDoctor(c) && departmentId) {
    return json(fail(ErrorCode.FORBIDDEN, 'doctor 不可跨科室查询（请不传 departmentId）'), 403);
  }
  if (isNurse(c)) {
    // nurse 只允许 overview，其他一律 403（在路由层单独拦）
  }
  return null;
}

export const qualityDashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/quality/dashboard/overview',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c) && !isDoctor(c) && !isNurse(c)) {
        return json(fail(ErrorCode.FORBIDDEN, '仅 admin/doctor/nurse 可访问质量面板'), 403);
      }
      const w = parseWindow(c);
      if (w.err) return json(fail(ErrorCode.BAD_REQUEST, w.err), 400);
      const denied = guardDepartment(c, w.departmentId);
      if (denied) return denied;
      return json(ok(computeOverview(w.departmentId, w.from, w.to)));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/quality/dashboard/by-doctor',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c) && !isDoctor(c)) {
        return json(fail(ErrorCode.FORBIDDEN, '仅 admin/doctor 可按医生下钻'), 403);
      }
      const w = parseWindow(c);
      if (w.err) return json(fail(ErrorCode.BAD_REQUEST, w.err), 400);
      const denied = guardDepartment(c, w.departmentId);
      if (denied) return denied;
      const rows = byDoctor(w.departmentId, w.from, w.to);
      // doctor 只看自己
      const filtered = isAdmin(c) ? rows : rows.filter((r) => r.doctorId === c.user!.id);
      return json(ok({ rows: filtered, total: filtered.length }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/quality/dashboard/trend',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c) && !isDoctor(c)) {
        return json(fail(ErrorCode.FORBIDDEN, '仅 admin/doctor 可查看趋势'), 403);
      }
      const q = new URL(c.req.url).searchParams;
      const metric = q.get('metric') ?? '';
      if (!METRIC_WHITELIST.includes(metric as MetricKey)) {
        return json(fail(ErrorCode.BAD_REQUEST, `metric 必须在 ${METRIC_WHITELIST.join('/')} 内`), 400);
      }
      const w = parseWindow(c);
      if (w.err) return json(fail(ErrorCode.BAD_REQUEST, w.err), 400);
      const denied = guardDepartment(c, w.departmentId);
      if (denied) return denied;
      return json(ok({ metric, points: trend(metric as MetricKey, w.departmentId, w.from, w.to) }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/quality/dashboard/_seed',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c)) return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可灌种子数据'), 403);
      if (process.env.DEMO_MODE !== '1') {
        return json(fail(ErrorCode.FORBIDDEN, '仅 DEMO_MODE 下可灌种子'), 403);
      }
      seed();
      return json(ok({ seeded: true, overview: computeOverview() }), 201);
    },
  },
];
