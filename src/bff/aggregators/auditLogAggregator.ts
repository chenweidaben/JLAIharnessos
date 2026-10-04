/**
 * 健澜科技 jlmedaios - 审计日志查询聚合器（M8-C）
 *
 * 只读编排 auditLogRepo：分页列表、详情、概览统计、操作分布与趋势。
 * 审计日志由哈希链保护、只追加，本聚合器不提供任何写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  type AuditLogFilter,
  type AuditLogView,
  auditActionDistribution,
  auditDailyTrend,
  auditLogOverview,
  getAuditLog,
  listAuditLogs,
} from '../../db/repositories/auditLogRepo.js';

/** 分页查询审计日志 */
export async function queryAuditLogs(filter: AuditLogFilter) {
  return listAuditLogs(filter);
}

/** 审计日志详情；不存在返回 null */
export async function getAuditLogDetail(seq: number): Promise<AuditLogView | null> {
  return getAuditLog(seq);
}

/** 概览统计 */
export async function auditOverview() {
  return auditLogOverview();
}

/** 操作类型分布 */
export async function auditDistribution() {
  return auditActionDistribution();
}

/** 近 N 天趋势 */
export async function auditTrend(days = 7) {
  return auditDailyTrend(days);
}
