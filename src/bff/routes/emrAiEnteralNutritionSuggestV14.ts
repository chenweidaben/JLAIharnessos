/**
 * 健澜科技 jlmedaios - 病历AI肠内营养支持建议 V14 路由（M564-C）
 *
 * GET  /api/v1/emr-ai-enteral-nutrition-suggest  （read，auth:true）返回 AI 肠内营养支持建议基础数据
 * POST /api/v1/emr-ai-enteral-nutrition-suggest  （auth:true）AI 肠内营养支持建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiEnteralNutritionSuggest,
  buildAiEnteralNutritionSuggestReport,
  suggestEnteralNutritionByAi,
  type AiEnteralNutritionSuggestInputV14,
} from "../aggregators/emrAiEnteralNutritionSuggestV14Aggregator.js";

export const emrAiEnteralNutritionSuggestV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-enteral-nutrition-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-enteral-nutrition-suggest:read");
      if (denied) return denied;
      const base = buildAiEnteralNutritionSuggest("RECB080", "营养科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-enteral-nutrition-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-enteral-nutrition-suggest:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiEnteralNutritionSuggestInputV14 = {
        swallowing: String(obj?.swallowing ?? ""),
        gutFunction: String(obj?.gutFunction ?? ""),
      };
      const result = suggestEnteralNutritionByAi(input);
      const report = buildAiEnteralNutritionSuggestReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
