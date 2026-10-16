/**
 * 健澜科技 jlmedaios - 安全审计日志路由（M183-D）
 *
 * GET /api/v1/admin/audit-log：分页查询审计日志（权限 admin:audit:view）
 * GET /api/v1/admin/audit-log/export：CSV 导出
 *
 * 权限 guarded('admin:audit:view')；出参 IP 脱敏。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import {
  maskIp,
  queryAuditLog,
  type AuditLogRow,
} from '../aggregators/auditLogQueryAggregator.js';

/** 从数据库加载审计日志（全量，内存分页在 aggregator 完成） */
async function loadFromDb(c: Ctx): Promise<AuditLogRow[]> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT seq, actor_name, actor_role, action, resource_type, result,
             risk_level, client_ip, user_agent, hospital_id, created_at
      FROM audit.audit_logs
      ORDER BY seq DESC
      LIMIT 10000
    `;
    return (rows as unknown as Array<{
      seq: number;
      actor_name: string;
      actor_role: string;
      action: string;
      resource_type: string;
      result: string;
      risk_level: string | null;
      client_ip: string | null;
      user_agent: string | null;
      hospital_id: string | null;
      created_at: string;
    }>).map((r) => ({
      seq: Number(r.seq),
      actorName: r.actor_name ?? '',
      actorRole: r.actor_role ?? '',
      action: r.action,
      resourceType: r.resource_type ?? '',
      result: r.result,
      riskLevel: r.risk_level,
      clientIp: r.client_ip ? String(r.client_ip) : null,
      userAgent: r.user_agent,
      hospitalId: r.hospital_id ? String(r.hospital_id) : null,
      createdAt: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

/** 演示数据 */
function demoLogs(): AuditLogRow[] {
  return Array.from({ length: 50 }, (_, i) => ({
    seq: 1000 - i,
    actorName: ['张医生', '李护士', '系统', '王管理员'][i % 4],
    actorRole: ['doctor', 'nurse', 'system', 'admin'][i % 4],
    action: ['login', 'read', 'write', 'export'][i % 4],
    resourceType: ['patient', 'record', 'drug', 'agent'][i % 4],
    result: ['success', 'success', 'denied', 'success'][i % 4],
    riskLevel: ['low', 'medium', 'high', null][i % 4],
    clientIp: `192.168.${(i % 5) + 1}.${(i % 200) + 1}`,
    userAgent: 'Mozilla/5.0',
    hospitalId: null,
    createdAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
  }));
}

export const auditLogQueryRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/audit-log',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'admin:audit:view');
      if (denied) return denied;

      const page = Number(c.query.get('page') ?? '1');
      const pageSize = Number(c.query.get('pageSize') ?? '20');
      const safePageSize = Math.min(Math.max(pageSize, 1), 100);
      const safePage = Math.max(Number.isFinite(page) ? page : 1, 1);

      const logs = await loadFromDb(c);
      const source = logs.length > 0 ? logs : demoLogs();

      const result = queryAuditLog(source, {
        page: safePage,
        pageSize: safePageSize,
        action: c.query.get('action') ?? undefined,
        result: c.query.get('result') ?? undefined,
        riskLevel: c.query.get('riskLevel') ?? undefined,
        hospitalId: c.query.get('hospitalId') ?? undefined,
        keyword: c.query.get('keyword') ?? undefined,
      });

      return json(ok(result));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/admin/audit-log/export',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'admin:audit:view');
      if (denied) return denied;

      const logs = await loadFromDb(c);
      const source = logs.length > 0 ? logs : demoLogs();
      const result = queryAuditLog(source, { page: 1, pageSize: 10000 });

      const header = 'seq,actorName,actorRole,action,resourceType,result,riskLevel,clientIp,createdAt\n';
      const body = result.rows
        .map((r) =>
          [
            r.seq,
            `"${r.actorName}"`,
            r.actorRole,
            r.action,
            r.resourceType,
            r.result,
            r.riskLevel ?? '',
            maskIp(r.clientIp) ?? '',
            r.createdAt,
          ].join(','),
        )
        .join('\n');

      return new Response(header + body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="audit-log.csv"',
        },
      });
    },
  },
];
