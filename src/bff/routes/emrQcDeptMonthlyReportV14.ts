/**
 * 健澜科技 jlmedaios - 科室质控月报自动生成 V14 路由（M518-A，避让 -dept）
 *
 * GET  /api/v1/emr-qc-dept-monthly-report  （read，auth:true）返回月报基础数据
 * POST /api/v1/emr-qc-dept-monthly-report  （auth:true）生成月报统计 + 摘要
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeptMonthlyReport,
  buildDeptMonthlyReportSummary,
  generateDeptMonthlyReport,
  type DeptMonthlyDefectsV14,
} from "../aggregators/emrQcDeptMonthlyReportV14Aggregator.js";

export const emrQcDeptMonthlyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-monthly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-monthly-report:read");
      if (denied) return denied;
      const report = buildDeptMonthlyReport("心内科", "2026-10", 300);
      return json(ok(report));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-dept-monthly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-monthly-report:write");
      if (denied) return denied;
      const body = await c.req.json();
      const report = buildDeptMonthlyReport(
        String(body?.dept ?? "心内科"),
        String(body?.month ?? "2026-10"),
        Number(body?.totalRecords ?? 300),
      );
      const defects: DeptMonthlyDefectsV14 = {
        block: Number(body?.defects?.block ?? 0),
        major: Number(body?.defects?.major ?? 0),
        minor: Number(body?.defects?.minor ?? 0),
      };
      const result = generateDeptMonthlyReport(report, defects);
      const summary = buildDeptMonthlyReportSummary(result);
      return json(ok({ report, defects, result, summary }));
    },
  },
];
