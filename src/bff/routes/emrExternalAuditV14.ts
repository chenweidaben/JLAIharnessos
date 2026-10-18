/**
 * 健澜科技 jlmedaios - 病历外审申请 V14 路由（M540-D）
 *
 * GET  /api/v1/emr-external-audit  （read，auth:true）返回外审申请基础数据
 * POST /api/v1/emr-external-audit  （auth:true）外审申请 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildExternalAudit,
  buildExternalAuditReport,
  applyExternalAudit,
  type ExternalAuditInputV14,
} from "../aggregators/emrExternalAuditV14Aggregator.js";

export const emrExternalAuditV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-external-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-external-audit:read");
      if (denied) return denied;
      const base = buildExternalAudit("REC704", "医务处");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-external-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-external-audit:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: ExternalAuditInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        auditOrg: String(obj?.auditOrg ?? ""),
        purpose: String(obj?.purpose ?? ""),
      };
      const result = applyExternalAudit(input);
      const report = buildExternalAuditReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
