/**
 * 健澜科技 jlmedaios - 审计日志聚合器
 *
 * 本模块分两层：
 *  - M8-C 哈希链审计（audit.audit_logs）：只读编排 auditLogRepo，
 *    提供分页列表、详情、概览统计、操作分布与趋势；不提供任何写操作。
 *  - M123-A 数据访问审计（medmuse.data_access_log）：纯函数层——
 *      logDataAccess 构造单条访问日志、
 *      queryAuditLogs(filters, logs) 内存筛选、
 *      maskDataAccessLog 出参脱敏；
 *    不依赖数据库与网络，便于单测与复用。
 *
 * 生产安全加固：
 *  - 数据访问审计只追加，应用层不自造主键（id 由数据库 bigserial 分配）；
 *  - 出参脱敏：患者号中段打码、IP 末两段打码，明文不落审计查询结果。
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

/* ============================================================================
 * M8-C 哈希链审计（audit.audit_logs，DB 只读编排）
 * ========================================================================== */

/** 分页查询哈希链审计日志（DB 分页） */
export async function queryAuditLogPage(filter: AuditLogFilter) {
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

/* ============================================================================
 * M123-A 数据访问审计（medmuse.data_access_log，纯函数层）
 * ========================================================================== */

/** 单条数据访问日志（与 medmuse.data_access_log 行对齐） */
export interface DataAccessLog {
  /** 日志流水号；构造时为 0，落库后由数据库回填 */
  id: number;
  /** 操作人工号 */
  staffId: string;
  /** 操作人角色：doctor / nurse / admin / pharmacist... */
  staffRole: string;
  /** 访问动作：view / export / download / print / edit... */
  action: string;
  /** 资源类型：patient / emr / prescription / order... */
  resourceType: string;
  /** 资源标识（列表页等聚合访问可为空） */
  resourceId: string;
  /** 脱敏患者号（严禁姓名 / 身份证号明文） */
  patientId: string;
  /** 访问时间 ISO 字符串 */
  accessedAt: string;
  /** 访问终端 IP（出参再打码） */
  ipAddress: string;
}

/** 审计查询过滤条件（全部可选；缺省返回全量，按时间倒序） */
export interface DataAccessLogFilter {
  staffId?: string;
  staffRole?: string;
  action?: string;
  resourceType?: string;
  patientId?: string;
  /** 起始时间（ISO，闭区间） */
  startTime?: string;
  /** 结束时间（ISO，闭区间） */
  endTime?: string;
}

/**
 * 构造一条数据访问审计日志（纯函数，无 DB 副作用）。
 * 入参统一 trim 归一；accessedAt 取当前时刻；id 恒为 0——
 * 生产安全加固：自增主键由数据库分配，应用层不自造 id，避免并发冲突。
 */
export function logDataAccess(
  staffId: string,
  role: string,
  action: string,
  resourceType: string,
  resourceId: string,
  patientId: string,
  ip: string,
): DataAccessLog {
  return {
    id: 0,
    staffId: (staffId ?? '').trim(),
    staffRole: (role ?? '').trim(),
    action: (action ?? '').trim(),
    resourceType: (resourceType ?? '').trim(),
    resourceId: (resourceId ?? '').trim(),
    patientId: (patientId ?? '').trim(),
    accessedAt: new Date().toISOString(),
    ipAddress: (ip ?? '').trim(),
  };
}

/** 大小写不敏感的包含匹配；关键字缺省时视为不限制 */
function matchField(value: string, keyword?: string): boolean {
  const kw = (keyword ?? '').trim().toLowerCase();
  if (!kw) return true;
  return (value ?? '').toLowerCase().includes(kw);
}

/**
 * 审计日志筛选（纯函数）：按员工 / 角色 / 动作 / 资源类型 / 患者号 /
 * 时间窗口过滤，结果按访问时间倒序。空列表或非法入参安全返回空数组。
 */
export function queryAuditLogs(
  filters: DataAccessLogFilter,
  logs: DataAccessLog[],
): DataAccessLog[] {
  const list = Array.isArray(logs) ? logs : [];
  const f = filters ?? {};
  return list
    .filter((l) => {
      if (!matchField(l.staffId, f.staffId)) return false;
      if (!matchField(l.staffRole, f.staffRole)) return false;
      if (!matchField(l.action, f.action)) return false;
      if (!matchField(l.resourceType, f.resourceType)) return false;
      if (!matchField(l.patientId, f.patientId)) return false;
      if (f.startTime && l.accessedAt < f.startTime) return false;
      if (f.endTime && l.accessedAt > f.endTime) return false;
      return true;
    })
    .sort((a, b) =>
      a.accessedAt < b.accessedAt ? 1 : a.accessedAt > b.accessedAt ? -1 : b.id - a.id,
    );
}

/** 生产安全加固：患者号脱敏——保留前 3 位 + 后 2 位，中段打码 */
export function maskPatientId(patientId: string): string {
  const s = (patientId ?? '').trim();
  if (!s) return '';
  if (s.length <= 4) return `${s[0]}***`;
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
}

/** 生产安全加固：IPv4 末两段打码（非 IPv4 不猜测，原样返回） */
export function maskIp(ip: string): string {
  const s = (ip ?? '').trim();
  if (!s) return '';
  const parts = s.split('.');
  if (parts.length !== 4) return s;
  return `${parts[0]}.${parts[1]}.*.*`;
}

/** 生产安全加固：出参脱敏——患者号与 IP 打码后再返回管理员 */
export function maskDataAccessLog(log: DataAccessLog): DataAccessLog {
  return {
    ...log,
    patientId: maskPatientId(log.patientId),
    ipAddress: maskIp(log.ipAddress),
  };
}
