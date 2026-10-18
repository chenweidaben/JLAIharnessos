/**
 * 健澜科技 jlmedaios - 质控操作日志查询明细 V14 聚合器（M507-B，-detail 避让）
 *
 * 纯函数：操作日志构建 + 日志搜索 + 查询报告构建。
 * 避让说明：M467-C 已有 emrQcAuditLogV14，M498-B 已用 -record 避让，本切片改用 -detail 后缀。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 操作日志 */
export interface AuditLogDetailV14 {
  user: string;
  action: string;
  time: string;
}

/** 查询报告 */
export interface AuditReportDetailV14 {
  resultCount: number;
  results: AuditLogDetailV14[];
}

/**
 * 构建操作日志。
 *
 * @param user 操作用户
 * @param action 操作动作
 * @param time 操作时间
 * @returns 操作日志
 */
export function buildAuditLog(user: string, action: string, time: string): AuditLogDetailV14 {
  return { user, action, time };
}

/**
 * 搜索日志（user 或 action 包含 keyword）。
 *
 * @param logs 日志数组
 * @param keyword 关键词
 * @returns 匹配的日志数组
 */
export function searchAuditLog(logs: AuditLogDetailV14[], keyword: string): AuditLogDetailV14[] {
  // 手算搜索：user 或 action 字段包含 keyword 即匹配
  return logs.filter((log) => log.user.includes(keyword) || log.action.includes(keyword));
}

/**
 * 构建查询报告。
 *
 * @param results 搜索结果数组
 * @returns 查询报告（resultCount + results）
 */
export function buildAuditReport(results: AuditLogDetailV14[]): AuditReportDetailV14 {
  return {
    resultCount: results.length,
    results,
  };
}
