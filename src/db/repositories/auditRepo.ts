/**
 * 健澜科技数智医院智能体 - 审计日志 Repository
 * audit.audit_log 表写入（只追加，不可修改/删除）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export interface AuditLogEntry {
  id: string; traceId: string | null; userId: string | null; username: string | null;
  action: string; resourceType: string | null; resourceId: string | null;
  patientId: string | null; ipAddress: string | null; userAgent: string | null;
  requestMethod: string | null; requestPath: string | null; statusCode: number | null;
  detail: Record<string, unknown>; createdAt: string;
}

export interface AuditLogCreateInput {
  traceId?: string | null; userId?: string | null; username?: string | null;
  action: string; resourceType?: string | null; resourceId?: string | null;
  patientId?: string | null; ipAddress?: string | null; userAgent?: string | null;
  requestMethod?: string | null; requestPath?: string | null;
  statusCode?: number | null; detail?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogCreateInput, sql?: Sql): Promise<void> {
  const db = sql ?? getDb();
  await db`
    INSERT INTO audit.audit_log (trace_id, user_id, username, action, resource_type, resource_id, patient_id, ip_address, user_agent, request_method, request_path, status_code, detail)
    VALUES (${entry.traceId ?? null}, ${entry.userId ?? null}, ${entry.username ?? null},
      ${entry.action}, ${entry.resourceType ?? null}, ${entry.resourceId ?? null},
      ${entry.patientId ?? null}, ${entry.ipAddress ?? null}, ${entry.userAgent ?? null},
      ${entry.requestMethod ?? null}, ${entry.requestPath ?? null},
      ${entry.statusCode ?? null}, ${db.json(toJson(entry.detail ?? {}))})
  `;
}

export async function queryAuditLogs(
  options: {
    userId?: string; action?: string; patientId?: string;
    startTime?: string; endTime?: string; limit?: number; offset?: number;
  },
  sql?: Sql,
): Promise<AuditLogEntry[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder();
  if (options.userId) qb.where('user_id = ?', options.userId);
  if (options.action) qb.where('action = ?', options.action);
  if (options.patientId) qb.where('patient_id = ?', options.patientId);
  if (options.startTime) qb.where('created_at >= ?', options.startTime);
  if (options.endTime) qb.where('created_at <= ?', options.endTime);
  const rows = await dynamicSelect<Record<string, unknown>>(db, '*', 'audit.audit_log', qb, 'created_at DESC', options.limit ?? 100, options.offset ?? 0);
  return rows as unknown as AuditLogEntry[];
}
