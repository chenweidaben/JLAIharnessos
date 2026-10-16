/**
 * 健澜科技 jlmedaios - 安全审计日志查询纯函数（M183-D）
 *
 * queryAuditLog(filters, logs)：内存分页 + 多维筛选纯函数，
 * 不依赖数据库，便于单测。出参脱敏：IP 末两段打码、敏感 detail 不落明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条审计日志 */
export interface AuditLogRow {
  seq: number;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  result: string;
  riskLevel: string | null;
  clientIp: string | null;
  userAgent: string | null;
  hospitalId: string | null;
  createdAt: string;
}

/** 筛选条件 */
export interface AuditLogQueryFilters {
  page: number;
  pageSize: number;
  action?: string;
  result?: string;
  riskLevel?: string;
  hospitalId?: string;
  keyword?: string;
}

/** 分页结果 */
export interface AuditLogPageResult {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 对审计日志集合执行筛选 + 分页（纯函数）。
 *
 * @param logs 全部审计日志（内存数组）
 * @param filters 筛选与分页条件
 * @returns 分页结果（rows 已脱敏 IP）
 */
export function queryAuditLog(
  logs: AuditLogRow[],
  filters: AuditLogQueryFilters,
): AuditLogPageResult {
  const {
    page,
    pageSize,
    action,
    result,
    riskLevel,
    hospitalId,
    keyword,
  } = filters;

  let filtered = [...logs];

  if (action) {
    filtered = filtered.filter((r) => r.action === action);
  }
  if (result) {
    filtered = filtered.filter((r) => r.result === result);
  }
  if (riskLevel) {
    filtered = filtered.filter((r) => r.riskLevel === riskLevel);
  }
  if (hospitalId) {
    filtered = filtered.filter((r) => r.hospitalId === hospitalId);
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.actorName.toLowerCase().includes(kw) ||
        r.resourceType.toLowerCase().includes(kw) ||
        String(r.seq).includes(kw),
    );
  }

  // 按时间倒序
  filtered.sort((a, b) => b.seq - a.seq);

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize).map((r) => ({
    ...r,
    clientIp: maskIp(r.clientIp),
  }));

  return { rows, total, page: safePage, pageSize, totalPages };
}

/**
 * IP 地址脱敏：末两段打码，例如 192.168.1.100 → 192.168.x.x。
 * 非 IPv4 格式原样返回。
 */
export function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.x.x`;
}
