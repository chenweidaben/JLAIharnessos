/**
 * 健澜科技 jlmedaios - 病历调阅日志审计 V14 路由（M534-B）
 *
 * GET  /api/v1/emr-access-audit-log  （read，auth:true）返回调阅日志审计基础数据
 * POST /api/v1/emr-access-audit-log  （auth:true）日志审计 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAccessAuditLog,
  buildAccessAuditLogReport,
  logAccessEvent,
  type AccessAuditLogInputV14,
} from "../aggregators/emrAccessAuditLogV14Aggregator.js";

export const emrAccessAuditLogV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-access-audit-log",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-access-audit-log:read");
      if (denied) return denied;
      const log = buildAccessAuditLog("REC101", "李医生");
      return json(ok(log));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-access-audit-log",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-access-audit-log:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AccessAuditLogInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        operator: String(obj?.operator ?? ""),
        action: (obj?.action ?? "查看") as AccessAuditLogInputV14["action"],
      };
      const result = logAccessEvent(input);
      const report = buildAccessAuditLogReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
