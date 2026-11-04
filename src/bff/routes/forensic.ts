/**
 * 健澜AI原生医院操作系统OS - P4-5 操作回放与取证包导出 路由
 *
 * 前缀 /api/v1/forensic：
 *  - GET  /replay?actorId=&from=&to=&limit=&offset=
 *  - GET  /replay-by-patient?patientId=&from=&to=&limit=&offset=
 *  - POST /packages            {actorId?, patientId?, from?, to?}
 *  - GET  /packages/:packageId
 *  - GET  /packages/:packageId/download?format=json|csv
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  createPackage, getPackage, packageToCsv, replay, validateQuery,
} from '../aggregators/forensicExportAggregator.js';

function isAdmin(c: Ctx): boolean {
  return (c.user?.roles ?? []).includes('admin');
}
function isDoctor(c: Ctx): boolean {
  return (c.user?.roles ?? []).includes('doctor');
}

export const forensicRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/forensic/replay',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c) && !isDoctor(c)) {
        return json(fail(ErrorCode.FORBIDDEN, '仅 admin/doctor 可访问回放'), 403);
      }
      const q = new URL(c.req.url).searchParams;
      const actorId = q.get('actorId') ?? undefined;
      const patientId = q.get('patientId') ?? undefined;
      const from = q.get('from') ?? undefined;
      const to = q.get('to') ?? undefined;
      const limit = q.get('limit') ? Number(q.get('limit')) : undefined;
      const offset = q.get('offset') ? Number(q.get('offset')) : undefined;

      // doctor 只能查自己
      if (!isAdmin(c) && actorId && actorId !== c.user?.id) {
        return json(fail(ErrorCode.FORBIDDEN, 'doctor 只能回放自己的操作'), 403);
      }
      const err = validateQuery({ actorId, patientId });
      if (err) return json(fail(ErrorCode.BAD_REQUEST, err), 400);

      const result = replay({ actorId, patientId, from, to, limit, offset });
      return json(ok({ rows: result.rows, total: result.total }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/forensic/replay-by-patient',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c)) return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可按患者反查'), 403);
      const q = new URL(c.req.url).searchParams;
      const patientId = q.get('patientId') ?? undefined;
      if (!patientId) return json(fail(ErrorCode.BAD_REQUEST, 'patientId 必填'), 400);
      const from = q.get('from') ?? undefined;
      const to = q.get('to') ?? undefined;
      const limit = q.get('limit') ? Number(q.get('limit')) : undefined;
      const offset = q.get('offset') ? Number(q.get('offset')) : undefined;
      const result = replay({ patientId, from, to, limit, offset });
      return json(ok({ rows: result.rows, total: result.total }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/forensic/packages',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c)) return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可生成取证包'), 403);
      const b = (await c.body()) as Record<string, unknown>;
      const actorId = typeof b.actorId === 'string' ? b.actorId : undefined;
      const patientId = typeof b.patientId === 'string' ? b.patientId : undefined;
      const from = typeof b.from === 'string' ? b.from : undefined;
      const to = typeof b.to === 'string' ? b.to : undefined;
      const err = validateQuery({ actorId, patientId, from, to });
      if (err) return json(fail(ErrorCode.BAD_REQUEST, err), 400);
      const pkg = createPackage({ actorId, patientId, from, to }, c.user!.id);
      return json(ok({
        packageId: pkg.packageId,
        generatedBy: pkg.generatedBy,
        generatedAt: pkg.generatedAt,
        query: pkg.query,
        eventCount: pkg.eventCount,
        hashChainValid: pkg.hashChainValid,
        hashChainBrokenAt: pkg.hashChainBrokenAt,
      }), 201);
    },
  },
  {
    method: 'GET',
    path: '/api/v1/forensic/packages/:packageId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c)) return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可查看取证包'), 403);
      const pkg = getPackage(c.params.packageId);
      if (!pkg) return json(fail(ErrorCode.NOT_FOUND, '取证包不存在'), 404);
      return json(ok({
        packageId: pkg.packageId,
        generatedBy: pkg.generatedBy,
        generatedAt: pkg.generatedAt,
        query: pkg.query,
        eventCount: pkg.eventCount,
        hashChainValid: pkg.hashChainValid,
        hashChainBrokenAt: pkg.hashChainBrokenAt,
      }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/forensic/packages/:packageId/download',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isAdmin(c)) return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可下载取证包'), 403);
      const pkg = getPackage(c.params.packageId);
      if (!pkg) return json(fail(ErrorCode.NOT_FOUND, '取证包不存在'), 404);
      const fmt = new URL(c.req.url).searchParams.get('format') ?? 'json';
      if (fmt !== 'json' && fmt !== 'csv') {
        return json(fail(ErrorCode.BAD_REQUEST, 'format 仅支持 json/csv'), 400);
      }
      if (fmt === 'csv') {
        return new Response(packageToCsv(pkg), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${pkg.packageId}.csv"`,
          },
        });
      }
      return json(ok(pkg));
    },
  },
];
