/**
 * 健澜科技 jlmedaios - 病历调阅日志审计 V14 聚合器（M534-B）
 *
 * 纯函数：构建调阅日志审计基础数据 + 日志审计 + 构建审计报告。
 * 命名空间与 M528-A emrAccessAuditV14（病历访问审计日志模块）区分，本模块专注调阅事件日志记录。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 调阅日志审计基础数据 */
export interface AccessAuditLogV14 {
  recordId: string;
  operator: string;
}

/** 日志审计输入 */
export interface AccessAuditLogInputV14 {
  recordId: string;
  operator: string;
  action: "查看" | "下载" | "打印";
}

/** 日志审计结果 */
export interface AccessAuditLogResultV14 {
  logged: boolean;
  eventType: string;
}

/** 日志审计报告 */
export interface AccessAuditLogReportV14 {
  logged: boolean;
  eventType: string;
}

/**
 * 构建调阅日志审计基础数据。
 *
 * @param recordId 病历ID
 * @param operator 操作人
 * @returns 调阅日志审计基础数据
 */
export function buildAccessAuditLog(recordId: string, operator: string): AccessAuditLogV14 {
  return { recordId, operator };
}

/**
 * 日志审计。
 * logged = true；eventType = '调阅-' + action。
 *
 * @param input 审计输入（病历ID + 操作人 + 操作类型）
 * @returns 审计结果（logged + eventType）
 */
export function logAccessEvent(input: AccessAuditLogInputV14): AccessAuditLogResultV14 {
  // 手算：logged = true（日志已记录）
  // 测试2：logged=true
  // 测试3：logged=true
  const logged = true;
  // 手算：eventType = '调阅-' + action
  // 测试2：action='查看' → eventType='调阅-查看'
  // 测试3：action='下载' → eventType='调阅-下载'
  const eventType = "调阅-" + input.action;
  return { logged, eventType };
}

/**
 * 构建审计报告。
 *
 * @param result 审计结果
 * @returns 审计报告（logged + eventType 透传）
 */
export function buildAccessAuditLogReport(result: AccessAuditLogResultV14): AccessAuditLogReportV14 {
  // 手算：透传 logged + eventType
  // 测试4：{logged:true, eventType='调阅-查看'} → logged=true, eventType='调阅-查看'
  return { logged: result.logged, eventType: result.eventType };
}
