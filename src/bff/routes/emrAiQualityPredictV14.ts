/**
 * 健澜科技 jlmedaios - AI病历质量预测 V14 路由（M522-B）
 *
 * GET  /api/v1/emr-ai-quality-predict  （read，auth:true）返回质量预测基础数据
 * POST /api/v1/emr-ai-quality-predict  （auth:true）预测质量分 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQualityPredict,
  buildAiQualityPredictReport,
  predictQualityScore,
  type AiQualityPredictInputV14,
} from "../aggregators/emrAiQualityPredictV14Aggregator.js";

export const emrAiQualityPredictV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-quality-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-quality-predict:read");
      if (denied) return denied;
      const predict = buildAiQualityPredict("REC023", "入院记录");
      return json(ok(predict));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-quality-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-quality-predict:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: AiQualityPredictInputV14 = {
        completeness: Number(body?.completeness ?? 90),
        timeliness: Number(body?.timeliness ?? 85),
        accuracy: Number(body?.accuracy ?? 92),
      };
      const result = predictQualityScore(input);
      const report = buildAiQualityPredictReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
