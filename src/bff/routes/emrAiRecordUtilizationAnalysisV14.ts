/**
 * 健澜科技 jlmedaios - 病历AI病案利用分析 V14 路由（M556-D，M556 收官）
 *
 * GET  /api/v1/emr-ai-record-utilization-analysis  （read，auth:true）返回 AI 病案利用分析基础数据
 * POST /api/v1/emr-ai-record-utilization-analysis  （auth:true）AI 病案利用分析 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRecordUtilizationAnalysis,
  buildAiRecordUtilizationAnalysisReport,
  analyzeRecordUtilizationByAi,
  type AiRecordUtilizationAnalysisInputV14,
} from "../aggregators/emrAiRecordUtilizationAnalysisV14Aggregator.js";

export const emrAiRecordUtilizationAnalysisV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-record-utilization-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-utilization-analysis:read");
      if (denied) return denied;
      const base = buildAiRecordUtilizationAnalysis("RECB048", "病案室");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-record-utilization-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-utilization-analysis:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRecordUtilizationAnalysisInputV14 = {
        totalRecords: Number(obj?.totalRecords ?? 0),
        borrowedRecords: Number(obj?.borrowedRecords ?? 0),
        referencedRecords: Number(obj?.referencedRecords ?? 0),
      };
      const result = analyzeRecordUtilizationByAi(input);
      const report = buildAiRecordUtilizationAnalysisReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
