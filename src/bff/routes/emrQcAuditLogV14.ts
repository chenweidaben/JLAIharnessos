/**
 * 健澜科技 jlmedaios - 病历质控追溯审计日志 V14 路由（M467-C）
 *
 * GET /api/v1/emr-qc-audit-log  （read，auth:true，query 用 new URL 取 noteId/operator/ruleId）返回过滤后日志
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  filterAuditLogs,
  type AuditEntryV14,
} from "../aggregators/emrQcAuditLogV14Aggregator.js";

const demoLogs: AuditEntryV14[] = [
  { id: "L001", noteId: "N001", operator: "张三", ruleId: "R001", action: "flagged", timestamp: "2026-10-18T08:00:00Z" },
  { id: "L002", noteId: "N001", operator: "李四", ruleId: "R002", action: "resolved", timestamp: "2026-10-18T09:00:00Z" },
  { id: "L003", noteId: "N002", operator: "张三", ruleId: "R003", action: "flagged", timestamp: "2026-10-18T10:00:00Z" },
];

export const emrQcAuditLogV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-audit-log",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-audit-log:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const noteId = url.searchParams.get("noteId") ?? undefined;
      const operator = url.searchParams.get("operator") ?? undefined;
      const ruleId = url.searchParams.get("ruleId") ?? undefined;
      const filtered = filterAuditLogs(demoLogs, { noteId, operator, ruleId });
      return json(ok({ logs: filtered, total: filtered.length }));
    },
  },
];
