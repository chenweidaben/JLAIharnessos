/**
 * 健澜科技 jlmedaios - 病历AI出院小结自动生成 V14 路由（M555-D，M555 收官）
 *
 * GET  /api/v1/emr-ai-discharge-summary-gen  （read，auth:true）返回 AI 出院小结自动生成基础数据
 * POST /api/v1/emr-ai-discharge-summary-gen  （auth:true）AI 出院小结自动生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDischargeSummaryGen,
  buildAiDischargeSummaryGenReport,
  genDischargeSummaryByAi,
  type AiDischargeSummaryGenInputV14,
} from "../aggregators/emrAiDischargeSummaryGenV14Aggregator.js";

export const emrAiDischargeSummaryGenV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-discharge-summary-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-summary-gen:read");
      if (denied) return denied;
      const base = buildAiDischargeSummaryGen("RECB044", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-discharge-summary-gen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-summary-gen:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDischargeSummaryGenInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        opName: String(obj?.opName ?? ""),
        dischargeDay: Number(obj?.dischargeDay ?? 0),
      };
      const result = genDischargeSummaryByAi(input);
      const report = buildAiDischargeSummaryGenReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
