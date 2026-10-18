/**
 * 健澜科技 jlmedaios - AI 病历风险预测 V14 路由（M486-C）
 *
 * POST /api/v1/emr-ai-risk-predict  （auth:true，body 用 await c.req.json()）返回风险预测结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { predictAiRisk, buildRiskReport } from "../aggregators/emrAiRiskPredictV14Aggregator.js";

export const emrAiRiskPredictV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-ai-risk-predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-risk-predict:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        age?: number;
        diseases?: string[];
        symptoms?: string[];
      };
      const data = {
        age: body.age ?? 0,
        diseases: body.diseases ?? [],
        symptoms: body.symptoms ?? [],
      };
      const result = predictAiRisk(data);
      const report = buildRiskReport(result);
      return json(ok({ result, report }));
    },
  },
];
