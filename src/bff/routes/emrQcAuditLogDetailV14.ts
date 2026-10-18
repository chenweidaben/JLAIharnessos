/**
 * 健澜科技 jlmedaios - 质控操作日志查询明细 V14 路由（M507-B，-detail 避让）
 *
 * GET /api/v1/emr-qc-audit-log-detail?keyword=xxx  （read，auth:true）返回操作日志
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAuditLog,
  buildAuditReport,
  searchAuditLog,
  type AuditLogDetailV14,
} from "../aggregators/emrQcAuditLogDetailV14Aggregator.js";

const allLogs: AuditLogDetailV14[] = [
  buildAuditLog("张医生", "删除规范", "2026-10-15 10:30"),
  buildAuditLog("李医生", "新增参数", "2026-10-15 11:00"),
  buildAuditLog("张医生", "修改制度", "2026-10-16 09:15"),
];

export const emrQcAuditLogDetailV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-audit-log-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-audit-log-detail:read");
      if (denied) return denied;
      const keyword = new URL(c.req.url).searchParams.get("keyword") ?? "";
      const results = keyword ? searchAuditLog(allLogs, keyword) : allLogs;
      const report = buildAuditReport(results);
      return json(ok({ report }));
    },
  },
];
