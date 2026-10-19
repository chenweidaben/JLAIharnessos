/**
 * 健澜科技 jlmedaios - 病历AI病区交班报告生成 V14 路由（M557-D，M557 收官）
 *
 * GET  /api/v1/emr-ai-shift-report-gen  （read，auth:true）返回 AI 病区交班报告生成基础数据
 * POST /api/v1/emr-ai-shift-report-gen  （auth:true）AI 病区交班报告生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiShiftReportGen,
  buildAiShiftReportGenReport,
  genShiftReportByAi,
  type AiShiftReportGenInputV14,
} from "../aggregators/emrAiShiftReportGenV14Aggregator.js";

export const emrAiShiftReportGenV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-shift-report-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-shift-report-gen:read");
      if (denied) return denied;
      const base = buildAiShiftReportGen("RECB052", "护理部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-shift-report-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-shift-report-gen:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiShiftReportGenInputV14 = {
        ward: String(obj?.ward ?? ""),
        patientCount: Number(obj?.patientCount ?? 0),
        criticalCount: Number(obj?.criticalCount ?? 0),
      };
      const result = genShiftReportByAi(input);
      const report = buildAiShiftReportGenReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
