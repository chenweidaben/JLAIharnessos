/**
 * 健澜科技 jlmedaios - 病历AI营养风险筛查 V14 路由（M564-A）
 *
 * GET  /api/v1/emr-ai-nutrition-risk-screen  （read，auth:true）返回 AI 营养风险筛查基础数据
 * POST /api/v1/emr-ai-nutrition-risk-screen  （auth:true）AI 营养风险筛查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiNutritionRiskScreen,
  buildAiNutritionRiskScreenReport,
  screenNutritionRiskByAi,
  type AiNutritionRiskScreenInputV14,
} from "../aggregators/emrAiNutritionRiskScreenV14Aggregator.js";

export const emrAiNutritionRiskScreenV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-nutrition-risk-screen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nutrition-risk-screen:read");
      if (denied) return denied;
      const base = buildAiNutritionRiskScreen("RECB078", "营养科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-nutrition-risk-screen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nutrition-risk-screen:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiNutritionRiskScreenInputV14 = {
        bmi: Number(obj?.bmi ?? 0),
        weightLoss: Number(obj?.weightLoss ?? 0),
        intakeReduced: Number(obj?.intakeReduced ?? 0),
      };
      const result = screenNutritionRiskByAi(input);
      const report = buildAiNutritionRiskScreenReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
