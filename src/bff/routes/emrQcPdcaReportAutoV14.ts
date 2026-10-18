/**
 * 健澜科技 jlmedaios - 质控PDCA报告自动生成 V14 路由（M518-D，M518 收官，避让 -auto）
 *
 * GET  /api/v1/emr-qc-pdca-auto-report  （read，auth:true）返回PDCA报告基础数据
 * POST /api/v1/emr-qc-pdca-auto-report  （auth:true）生成PDCA改进指标 + 摘要
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPdcaReportAuto,
  buildPdcaReportAutoSummary,
  generatePdcaReportAuto,
  type PdcaMetricsAutoV14,
} from "../aggregators/emrQcPdcaReportAutoV14Aggregator.js";

export const emrQcPdcaReportAutoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-pdca-auto-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pdca-auto-report:read");
      if (denied) return denied;
      const report = buildPdcaReportAuto("病历书写质量改进", "心内科", "Check");
      return json(ok(report));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-pdca-auto-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pdca-auto-report:write");
      if (denied) return denied;
      const body = await c.req.json();
      const report = buildPdcaReportAuto(
        String(body?.projectName ?? "病历书写质量改进"),
        String(body?.dept ?? "心内科"),
        String(body?.phase ?? "Check"),
      );
      const metrics: PdcaMetricsAutoV14 = {
        beforeScore: Number(body?.metrics?.beforeScore ?? 0),
        afterScore: Number(body?.metrics?.afterScore ?? 0),
      };
      const result = generatePdcaReportAuto(report, metrics);
      const summary = buildPdcaReportAutoSummary(result);
      return json(ok({ report, metrics, result, summary }));
    },
  },
];
