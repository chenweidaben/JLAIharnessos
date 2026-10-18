/**
 * 健澜科技 jlmedaios - 病历AI缺陷预测 V14 路由（M543-C）
 *
 * GET  /api/v1/emr-ai-defect-predict  （read，auth:true）返回 AI 缺陷预测基础数据
 * POST /api/v1/emr-ai-defect-predict  （auth:true）AI 缺陷预测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDefectPredict,
  buildAiDefectPredictReport,
  predictDefectByAi,
  type AiDefectPredictInputV14,
} from "../aggregators/emrAiDefectPredictV14Aggregator.js";

export const emrAiDefectPredictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-defect-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-defect-predict:read");
      if (denied) return denied;
      const base = buildAiDefectPredict("REC902", "普外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-defect-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-defect-predict:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDefectPredictInputV14 = {
        recordType: String(obj?.recordType ?? ""),
        hasSignature: Boolean(obj?.hasSignature ?? false),
        hasDischarge: Boolean(obj?.hasDischarge ?? false),
      };
      const result = predictDefectByAi(input);
      const report = buildAiDefectPredictReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
