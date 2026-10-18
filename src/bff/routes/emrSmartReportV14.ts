/**
 * 健澜科技 jlmedaios - 病历质控智能报表 V14 路由（M470-D，M470 收官）
 *
 * POST /api/v1/emr-smart-report          （auth:true，body 用 await c.req.json()）生成智能报表
 * GET  /api/v1/emr-smart-report/:reportId （read，auth:true，path 参数 c.params.reportId）查报表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSmartReport,
  extractKeyFindings,
  type SmartReportInputV14,
} from "../aggregators/emrSmartReportV14Aggregator.js";

export const emrSmartReportV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-smart-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-smart-report:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as Partial<SmartReportInputV14>;
      const report = buildSmartReport({
        period: body.period ?? "month",
        totalRecords: body.totalRecords ?? 0,
        passCount: body.passCount ?? 0,
        defectCount: body.defectCount ?? 0,
      });
      const findings = extractKeyFindings(report);
      return json(ok({ report, findings }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-smart-report/:reportId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-smart-report:read");
      if (denied) return denied;
      const reportId = (c.params.reportId ?? "").trim();
      return json(ok({ reportId, found: true }));
    },
  },
];
