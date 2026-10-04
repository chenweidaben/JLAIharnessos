/**
 * 健澜科技 jlmedaios - 审计日志与登录日志 API 服务（M8-C）
 *
 * 真实 BFF（src/bff/routes/admin/auditLogs.ts、loginLogs.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post } from '../request';
import type {
  AuditDistribution,
  AuditLogItem,
  AuditLogQuery,
  AuditOverview,
  DailyTrend,
  LoginDailyTrend,
  LoginLogQuery,
  LoginOverview,
  PagedAuditLogs,
  PagedLoginLogs,
} from '@/types/adminLog';

/** 把筛选对象序列化为 query string（跳过空值） */
function toQuery(params: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(
    params as Record<string, unknown>,
  )) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/* ---------------- 审计日志 ---------------- */

export function fetchAuditLogs(query: AuditLogQuery): Promise<PagedAuditLogs> {
  return get<PagedAuditLogs>(`/admin/audit-logs${toQuery(query)}`);
}

export function fetchAuditOverview(): Promise<AuditOverview> {
  return get<AuditOverview>('/admin/audit-logs/overview');
}

export function fetchAuditDistribution(): Promise<AuditDistribution[]> {
  return get<AuditDistribution[]>('/admin/audit-logs/distribution');
}

export function fetchAuditTrend(days = 7): Promise<DailyTrend[]> {
  return get<DailyTrend[]>(`/admin/audit-logs/trend?days=${days}`);
}

export function fetchAuditLog(seq: number): Promise<AuditLogItem> {
  return get<AuditLogItem>(`/admin/audit-logs/${seq}`);
}

/* ---------------- 登录日志 ---------------- */

export function fetchLoginLogs(query: LoginLogQuery): Promise<PagedLoginLogs> {
  return get<PagedLoginLogs>(`/admin/login-logs${toQuery(query)}`);
}

export function fetchLoginOverview(): Promise<LoginOverview> {
  return get<LoginOverview>('/admin/login-logs/overview');
}

export function fetchLoginTrend(days = 7): Promise<LoginDailyTrend[]> {
  return get<LoginDailyTrend[]>(`/admin/login-logs/trend?days=${days}`);
}

/** 强制在线用户下线 */
export function forceUserLogout(userId: string): Promise<{ revoked: number }> {
  return post<{ revoked: number }>('/admin/login-logs/force-logout', { userId });
}
