/**
 * 健澜科技 jlmedaios - 审计日志查询 Repository（M8-C）
 *
 * 只读查询 audit.audit_logs（哈希链防篡改、只追加），为系统管理「操作审计」页提供：
 *  - 分页列表（操作人/动作/资源类型/结果/风险/时间范围筛选）；
 *  - 单条详情；
 *  - 概览统计（今日/异常/高危/累计）；
 *  - 操作类型分布与近 N 天趋势。
 *
 * 本仓储不提供任何修改/删除接口——审计日志只读，保证合规。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/** 审计日志视图 */
export interface AuditLogView {
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

/** 审计日志筛选条件 */
export interface AuditLogFilter {
  actorKeyword?: string;
  action?: string;
  resourceType?: string;
  result?: string;
  riskLevel?: string;
  startTime?: string;
  endTime?: string;
  page: number;
  pageSize: number;
}

export interface PagedAuditLogs {
  items: AuditLogView[];
  total: number;
  page: number;
  pageSize: number;
}

function mapRow(row: Record<string, unknown>): AuditLogView {
  return {
    seq: Number(row.seq),
    traceId: row.trace_id != null ? String(row.trace_id) : null,
    actorId: row.actor_id != null ? String(row.actor_id) : null,
    actorName: row.actor_name != null ? String(row.actor_name) : null,
    actorRole: row.actor_role != null ? String(row.actor_role) : null,
    action: String(row.action),
    resourceType: row.resource_type != null ? String(row.resource_type) : null,
    resourceId: row.resource_id != null ? String(row.resource_id) : null,
    result: String(row.result),
    riskLevel: row.risk_level != null ? String(row.risk_level) : null,
    clientIp: row.client_ip != null ? String(row.client_ip) : null,
    userAgent: row.user_agent != null ? String(row.user_agent) : null,
    detail: (row.detail as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}

const SELECT_COLS = `seq, trace_id, actor_id, actor_name, actor_role, action,
  resource_type, resource_id, result, risk_level,
  host(client_ip) AS client_ip, user_agent, detail, created_at`;

/** 构造筛选 WHERE 片段（动态条件，避免空参数类型推断失败） */
function buildWhere(db: DbExecutor, f: AuditLogFilter) {
  const kw = f.actorKeyword?.trim();
  return db`
    ${kw ? db`AND (actor_name ILIKE ${'%' + kw + '%'} OR actor_id::text ILIKE ${'%' + kw + '%'})` : db``}
    ${f.action ? db`AND action = ${f.action}` : db``}
    ${f.resourceType ? db`AND resource_type = ${f.resourceType}` : db``}
    ${f.result ? db`AND result = ${f.result}` : db``}
    ${f.riskLevel ? db`AND risk_level = ${f.riskLevel}` : db``}
    ${f.startTime ? db`AND created_at >= ${f.startTime}` : db``}
    ${f.endTime ? db`AND created_at <= ${f.endTime}` : db``}
  `;
}

/** 分页查询审计日志 */
export async function listAuditLogs(
  filter: AuditLogFilter,
  sql?: DbExecutor,
): Promise<PagedAuditLogs> {
  const db = sql ?? getDb();
  const page = Math.max(1, filter.page);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize));
  const where = buildWhere(db, filter);
  const totalRows = await db`
    SELECT count(*)::int AS n FROM audit.audit_logs WHERE 1=1 ${where}
  `;
  const total = Number((totalRows[0] as Record<string, unknown>).n);
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)}
    FROM audit.audit_logs
    WHERE 1=1 ${where}
    ORDER BY seq DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;
  return {
    items: (rows as Record<string, unknown>[]).map(mapRow),
    total,
    page,
    pageSize,
  };
}

/** 单条审计日志详情；不存在返回 null */
export async function getAuditLog(seq: number, sql?: DbExecutor): Promise<AuditLogView | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)} FROM audit.audit_logs WHERE seq = ${seq}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 概览统计：今日操作 / 异常（denied+failure）/ 高危 / 累计 */
export async function auditLogOverview(sql?: DbExecutor): Promise<{
  today: number;
  abnormal: number;
  highRisk: number;
  total: number;
}> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today,
      count(*) FILTER (WHERE result IN ('denied','failure'))::int AS abnormal,
      count(*) FILTER (WHERE risk_level = 'high')::int AS high_risk
    FROM audit.audit_logs
  `;
  const r = rows[0] as Record<string, unknown>;
  return {
    total: Number(r.total),
    today: Number(r.today),
    abnormal: Number(r.abnormal),
    highRisk: Number(r.high_risk),
  };
}

/** 操作类型分布（按 action 分组，供饼图） */
export async function auditActionDistribution(
  sql?: DbExecutor,
): Promise<{ action: string; count: number }[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT action, count(*)::int AS n
    FROM audit.audit_logs
    GROUP BY action
    ORDER BY n DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    action: String(r.action),
    count: Number(r.n),
  }));
}

/** 近 N 天每日审计量（含成功/异常拆分，供趋势图） */
export async function auditDailyTrend(
  days = 7,
  sql?: DbExecutor,
): Promise<{ date: string; total: number; abnormal: number }[]> {
  const db = sql ?? getDb();
  const n = Math.min(90, Math.max(1, days));
  const rows = await db`
    SELECT d::date AS date,
      count(l.seq)::int AS total,
      count(l.seq) FILTER (WHERE l.result IN ('denied','failure'))::int AS abnormal
    FROM generate_series(date_trunc('day', now()) - ${n - 1} * interval '1 day',
                         date_trunc('day', now()), interval '1 day') d
    LEFT JOIN audit.audit_logs l ON l.created_at >= d AND l.created_at < d + interval '1 day'
    GROUP BY d ORDER BY d
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    date: String(r.date),
    total: Number(r.total),
    abnormal: Number(r.abnormal),
  }));
}
