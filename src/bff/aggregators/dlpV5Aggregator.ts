/**
 * 健澜科技 jlmedaios - 操作审计与数据防泄漏 DLP V5 纯函数（M282-C）
 *
 * detectDLPV5 / assessExportRiskV5 / alertDLPV5 / buildDlpV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DLP 事件 */
export interface DLPEvent {
  userId: string;
  action: string;
  resource: string;
  rowCount: number;
  sensitiveFields: string[];
}

/** 导出审批 */
export interface ExportRequest {
  userId: string;
  exportType: string;
  rows: number;
  destination: string;
}

/**
 * DLP 泄漏检测 V5（纯函数）：大批量+敏感字段即告警。
 *
 * @param event DLP 事件
 * @returns 风险等级
 */
export function detectDLPV5(event: DLPEvent): { risk: "low" | "medium" | "high"; blocked: boolean } {
  let risk: "low" | "medium" | "high" = "low";
  if (event.sensitiveFields.length > 0 && event.rowCount > 1000) risk = "high";
  else if (event.sensitiveFields.length > 0 && event.rowCount > 100) risk = "medium";
  else if (event.rowCount > 5000) risk = "high";
  return { risk, blocked: risk === "high" };
}

/**
 * 导出风险评估 V5（纯函数）：外发目的+行数。
 *
 * @param exportReq 导出请求
 * @returns 是否需要审批
 */
export function assessExportRiskV5(exportReq: ExportRequest): { needsApproval: boolean; risk: number } {
  let risk = 0;
  if (exportReq.rows > 1000) risk += 50;
  if (["external_email", "usb", "public_cloud"].includes(exportReq.destination)) risk += 40;
  if (exportReq.exportType === "full_patient") risk += 30;
  return { needsApproval: risk >= 50, risk };
}

/**
 * DLP 告警 V5（纯函数）：按风险等级生成告警。
 *
 * @param event DLP 事件
 * @returns 告警信息
 */
export function alertDLPV5(event: DLPEvent): { level: string; message: string; notify: string[] } {
  const detection = detectDLPV5(event);
  let level = "INFO";
  const notify: string[] = ["安全运营"];
  if (detection.risk === "high") {
    level = "CRITICAL";
    notify.push("信息科主任", "院领导");
  } else if (detection.risk === "medium") {
    level = "WARN";
    notify.push("信息科值班");
  }
  return {
    level,
    message: `用户${event.userId}在${event.action}${event.resource}涉及${event.sensitiveFields.length}个敏感字段共${event.rowCount}行`,
    notify,
  };
}

/** DLP 看板输出 */
export interface DlpV5Report {
  totalEvents: number;
  highRiskCount: number;
  blockedCount: number;
  pendingApprovals: number;
}

/**
 * 构建 DLP 看板（纯函数）。
 *
 * @param events 事件列表
 * @param exports 导出请求列表
 * @returns 看板
 */
export function buildDlpV5Report(events: DLPEvent[], exports: ExportRequest[]): DlpV5Report {
  let highRiskCount = 0;
  let blockedCount = 0;
  let pendingApprovals = 0;
  for (const e of events) {
    const d = detectDLPV5(e);
    if (d.risk === "high") highRiskCount += 1;
    if (d.blocked) blockedCount += 1;
  }
  for (const x of exports) {
    if (assessExportRiskV5(x).needsApproval) pendingApprovals += 1;
  }
  return { totalEvents: events.length, highRiskCount, blockedCount, pendingApprovals };
}
