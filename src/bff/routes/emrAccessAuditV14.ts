/**
 * 健澜科技 jlmedaios - 病历访问审计日志 V14 路由（M528-A）
 *
 * GET  /api/v1/emr-access-audit  （read，auth:true）返回访问审计基础数据
 * POST /api/v1/emr-access-audit  （auth:true）访问日志记录 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAccessAudit,
  buildAccessAuditReport,
  logAccessEvent,
  type AccessAuditInputV14,
} from "../aggregators/emrAccessAuditV14Aggregator.js";

export const emrAccessAuditV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-access-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-access-audit:read");
      if (denied) return denied;
      const audit = buildAccessAudit("REC050", "张医生");
      return json(ok(audit));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-access-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-access-audit:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: AccessAuditInputV14 = {
        recordId: String(body?.recordId ?? ""),
        operator: String(body?.operator ?? ""),
        action: (body?.action as "查看" | "修改" | "导出") ?? "查看",
        isSensitive: Boolean(body?.isSensitive ?? false),
      };
      const result = logAccessEvent(input);
      const report = buildAccessAuditReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
