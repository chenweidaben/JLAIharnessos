/**
 * 健澜科技 jlmedaios - 质控操作日志审计记录 V14 路由（M498-B，避让 M467-C emrQcAuditLogV14）
 *
 * GET /api/v1/emr-qc-audit-log-record  （read，auth:true）返回操作日志
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAuditLog, filterAuditLog } from "../aggregators/emrQcAuditLogRecordV14Aggregator.js";

const sampleLogs = [
  buildAuditLog("张医生", "提交病历", "2026-10-18 10:00"),
  buildAuditLog("李医生", "审核病历", "2026-10-18 11:00"),
  buildAuditLog("张医生", "修改病历", "2026-10-18 14:00"),
];

export const emrQcAuditLogRecordV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-audit-log-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-audit-log-record:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const keyword = url.searchParams.get("keyword") ?? "";
      const filtered = keyword ? filterAuditLog(sampleLogs, keyword) : sampleLogs;
      return json(ok({ logs: filtered, total: sampleLogs.length }));
    },
  },
];
