/**
 * 健澜AI原生医院操作系统OS - P5-3 EMPI 跨域路由
 *
 * 前缀 /api/v1/empi：
 *  - POST /links                       建立跨域链接（admin）
 *  - GET  /masters/:masterPatientId    查 master 下所有 link
 *  - GET  /resolve?sourceSystem=&sourcePatientId=   反查 master
 *  - GET  /match?idCard=|name+birthDate+gender|phone  匹配候选
 *  - GET  /masters?limit=&offset=      列 master（admin）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  getMaster, link, listMasters, match, resolve, validateIdCard,
} from '../aggregators/empiFederatedAggregator.js';

function requireAdmin(c: Ctx): Response | null {
  if (!(c.user?.roles ?? []).includes('admin')) {
    return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可操作 EMPI 链接'), 403);
  }
  return null;
}

export const empiFederatedRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/empi/links',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const b = (await c.body()) as Record<string, any>;
      if (!b.sourceSystem || !b.sourcePatientId) {
        return json(fail(ErrorCode.BAD_REQUEST, 'sourceSystem 与 sourcePatientId 必填'), 400);
      }
      if (b.idCard && !validateIdCard(b.idCard)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'idCard 格式非法（18 位，末位 X 允许）'), 400);
      }
      const r = link({
        masterPatientId: b.masterPatientId,
        sourceSystem: b.sourceSystem,
        sourcePatientId: b.sourcePatientId,
        idCard: b.idCard, name: b.name, birthDate: b.birthDate,
        gender: b.gender, phone: b.phone,
      });
      if (!r.ok) {
        if (r.error === 'duplicate-link') return json(fail(ErrorCode.CONFLICT, 'duplicate-link'), 409);
        return json(fail(ErrorCode.BAD_REQUEST, 'missing-source'), 400);
      }
      return json(ok(r), 201);
    },
  },
  {
    method: 'GET',
    path: '/api/v1/empi/masters/:masterPatientId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const r = getMaster(c.params.masterPatientId);
      if (!r) return json(fail(ErrorCode.NOT_FOUND, 'master 不存在'), 404);
      return json(ok(r));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/empi/resolve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const sp = new URL(c.req.url).searchParams;
      const ss = sp.get('sourceSystem') ?? '';
      const spid = sp.get('sourcePatientId') ?? '';
      if (!ss || !spid) return json(fail(ErrorCode.BAD_REQUEST, 'sourceSystem 与 sourcePatientId 必填'), 400);
      const masterId = resolve(ss, spid);
      if (!masterId) return json(fail(ErrorCode.NOT_FOUND, '未找到对应 master'), 404);
      return json(ok({ sourceSystem: ss, sourcePatientId: spid, masterPatientId: masterId }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/empi/match',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const sp = new URL(c.req.url).searchParams;
      const idCard = sp.get('idCard') ?? undefined;
      const name = sp.get('name') ?? undefined;
      const birthDate = sp.get('birthDate') ?? undefined;
      const gender = (sp.get('gender') as 'M' | 'F' | null) ?? undefined;
      const phone = sp.get('phone') ?? undefined;
      if (!idCard && !(name && birthDate && gender) && !phone) {
        return json(fail(ErrorCode.BAD_REQUEST, '至少提供 idCard 或 name+birthDate+gender 或 phone'), 400);
      }
      const r = match({ idCard, name, birthDate, gender, phone });
      return json(ok(r));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/empi/masters',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const sp = new URL(c.req.url).searchParams;
      const limit = Number(sp.get('limit') ?? 50);
      const offset = Number(sp.get('offset') ?? 0);
      return json(ok(listMasters(limit, offset)));
    },
  },
];
