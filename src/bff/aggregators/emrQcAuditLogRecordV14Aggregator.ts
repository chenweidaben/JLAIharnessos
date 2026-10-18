/**
 * 健澜科技 jlmedaios - 质控操作日志审计记录 V14 聚合器（M498-B，避让 M467-C emrQcAuditLogV14）
 *
 * 纯函数：操作日志构建 + 日志关键词过滤。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 操作日志 */
export interface AuditLogRecordV14 {
  user: string;
  action: string;
  time: string;
}

/**
 * 构建操作日志。
 *
 * @param user 操作人
 * @param action 操作动作
 * @param time 操作时间
 * @returns 操作日志
 */
export function buildAuditLog(user: string, action: string, time: string): AuditLogRecordV14 {
  return { user, action, time };
}

/**
 * 按关键词过滤日志（user 或 action 包含 keyword）。
 *
 * @param logs 日志数组
 * @param keyword 关键词
 * @returns 过滤后的日志数组
 */
export function filterAuditLog(logs: AuditLogRecordV14[], keyword: string): AuditLogRecordV14[] {
  // 手算过滤：user 或 action 字段包含 keyword 字符串即匹配
  return logs.filter((log) => log.user.includes(keyword) || log.action.includes(keyword));
}
