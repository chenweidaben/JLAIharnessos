/**
 * 健澜科技 jlmedaios - 病历质控追溯审计日志 V14 聚合器（M467-C）
 *
 * 纯函数：记录审计日志 + 多条件过滤。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 审计日志条目 */
export interface AuditEntryV14 {
  id: string;
  noteId: string;
  operator: string;
  ruleId: string;
  action: string;
  timestamp?: string;
}

/** 过滤条件 */
export interface AuditFilterV14 {
  noteId?: string;
  operator?: string;
  ruleId?: string;
}

/**
 * 记录审计日志（自动补 timestamp）。
 *
 * @param entry 审计条目
 * @returns 补全 timestamp 后的条目
 */
export function recordQcAudit(entry: AuditEntryV14): AuditEntryV14 {
  return {
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
}

/**
 * 按多条件过滤审计日志（noteId/operator/ruleId 三者 AND，空条件不过滤）。
 *
 * @param logs 日志列表
 * @param filter 过滤条件
 * @returns 过滤后的日志列表
 */
export function filterAuditLogs(logs: AuditEntryV14[], filter: AuditFilterV14): AuditEntryV14[] {
  return logs.filter((log) => {
    if (filter.noteId && log.noteId !== filter.noteId) return false;
    if (filter.operator && log.operator !== filter.operator) return false;
    if (filter.ruleId && log.ruleId !== filter.ruleId) return false;
    return true;
  });
}
