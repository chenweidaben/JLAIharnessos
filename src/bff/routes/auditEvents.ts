/**
 * 健澜AI原生医院操作系统OS - P4-1 全链路审计日志路由
 *
 * 前缀 /api/v1/audit/events：
 *  - GET  /                      查询（admin 全部；doctor/nurse/pharmacist 只能查自己）
 *  - GET  /export?format=csv     admin 导出 CSV
 *  - GET  /verify-chain         admin 校验哈希链
 *  - POST /_seed                 DEMO_MODE 灌样本
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  AuditError, recordEvent, queryEvents, exportCsv, verifyChain,
} from '../aggregators/auditEventAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof AuditError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

function enforceScope(c: Ctx, requestedActorId: string): void {
  const roles = c.user?.roles ?? [];
  const actorId = c.user?.id ?? '';
  if (roles.includes('patient')) throw new AuditError(403, 'patient 角色不能查询审计日志');
  if (!roles.includes('admin')) {
    // 非 admin 强制 actorId = JWT sub
    if (requestedActorId && requestedActorId !== actorId) {
      throw new AuditError(403, `只能查自己的审计（请求 actorId=${requestedActorId}，JWT sub=${actorId}）`);
    }
  }
}

export const auditEventRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/audit/events',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const roles = c.user?.roles ?? [];
        const u = new URL(c.req.url);
        const requestedActorId = u.searchParams.get('actorId') ?? '';
        enforceScope(c, requestedActorId);
        // 非 admin 强制 actorId=JWT sub
        const actorId = roles.includes('admin') ? (requestedActorId || undefined) : (c.user?.id ?? '');
        const limitRaw = Number(u.searchParams.get('limit') ?? '50');
        if (Number.isFinite(limitRaw) && limitRaw > 500) throw new AuditError(400, 'limit 不能超过 500');
        const r = queryEvents({
          actorId,
          module: u.searchParams.get('module') ?? undefined,
          action: u.searchParams.get('action') ?? undefined,
          result: u.searchParams.get('result') ?? undefined,
          patientId: u.searchParams.get('patientId') ?? undefined,
          from: u.searchParams.get('from') ?? undefined,
          to: u.searchParams.get('to') ?? undefined,
          limit: Number.isFinite(limitRaw) ? limitRaw : 50,
          offset: Number(u.searchParams.get('offset') ?? '0'),
        });
        return json(ok(r));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/audit/events/export',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const roles = c.user?.roles ?? [];
        if (!roles.includes('admin')) throw new AuditError(403, '仅 admin 可导出审计 CSV');
        const csv = exportCsv();
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="audit-events.csv"',
          },
        });
      } catch (e) {
        if (e instanceof AuditError) return mapError(e);
        return mapError(e);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/audit/events/verify-chain',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const roles = c.user?.roles ?? [];
        if (!roles.includes('admin')) throw new AuditError(403, '仅 admin 可校验哈希链');
        return json(ok(verifyChain()));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/audit/events/_seed',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        if (process.env.DEMO_MODE !== '1') throw new AuditError(403, '_seed 仅 DEMO_MODE 可用');
        const roles = c.user?.roles ?? [];
        if (!roles.includes('admin')) throw new AuditError(403, '_seed 仅 admin');
        const b = (await c.body()) as Record<string, unknown>;
        const items = Array.isArray(b.items) ? (b.items as Array<Record<string, unknown>>) : [];
        const out = items.map((it) => recordEvent({
          actorId: String(it.actorId ?? ''), actorRole: it.actorRole, action: it.action,
          module: String(it.module ?? ''), resourceType: String(it.resourceType ?? ''),
          resourceId: String(it.resourceId ?? ''), patientId: it.patientId === undefined ? undefined : String(it.patientId),
          result: it.result, errorCode: it.errorCode === undefined ? undefined : String(it.errorCode),
          ip: String(it.ip ?? '10.0.0.1'), userAgent: String(it.userAgent ?? 'seed'),
          occurredAt: it.occurredAt === undefined ? undefined : String(it.occurredAt),
        }));
        return json(ok({ seeded: out.length }));
      } catch (e) { return mapError(e); }
    },
  },
];
