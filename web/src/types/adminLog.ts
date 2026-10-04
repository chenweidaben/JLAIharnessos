/**
 * 健澜科技 jlmedaios - 审计日志与登录日志前端类型（M8-C）
 * 对应后端 auditLogRepo / loginAttemptRepo 的只读视图。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

/** 操作审计日志条目 */
export interface AuditLogItem {
  seq: number;
  traceId: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  result: string;
  riskLevel: string | null;
  clientIp: string | null;
  userAgent: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

/** 分页审计日志 */
export interface PagedAuditLogs {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 审计日志概览 */
export interface AuditOverview {
  total: number;
  today: number;
  abnormal: number;
  highRisk: number;
}

/** 操作类型分布 */
export interface AuditDistribution {
  action: string;
  count: number;
}

/** 审计/登录每日趋势 */
export interface DailyTrend {
  date: string;
  total: number;
  abnormal: number;
}

/** 登录日志条目 */
export interface LoginLogItem {
  id: number;
  username: string;
  userId: string | null;
  realName: string | null;
  department: string | null;
  success: boolean;
  failReason: string | null;
  ip: string | null;
  userAgent: string | null;
  online: boolean;
  createdAt: string;
}

/** 分页登录日志 */
export interface PagedLoginLogs {
  items: LoginLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 登录日志概览 */
export interface LoginOverview {
  today: number;
  online: number;
  todayFail: number;
  failRate: number;
}

/** 登录每日趋势（成功/失败） */
export interface LoginDailyTrend {
  date: string;
  success: number;
  failure: number;
}

/** 审计日志筛选 */
export interface AuditLogQuery {
  actorKeyword?: string;
  action?: string;
  resourceType?: string;
  result?: string;
  riskLevel?: string;
  page: number;
  pageSize: number;
}

/** 登录日志筛选 */
export interface LoginLogQuery {
  keyword?: string;
  success?: boolean;
  page: number;
  pageSize: number;
}
