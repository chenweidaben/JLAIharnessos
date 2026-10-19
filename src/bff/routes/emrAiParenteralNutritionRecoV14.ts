/**
 * 健澜科技 jlmedaios - 病历AI肠外营养配置推荐 V14 路由（M564-D）
 *
 * GET  /api/v1/emr-ai-parenteral-nutrition-reco  （read，auth:true）返回 AI 肠外营养配置推荐基础数据
 * POST /api/v1/emr-ai-parenteral-nutrition-reco  （auth:true）AI 肠外营养配置推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiParenteralNutritionReco,
  buildAiParenteralNutritionRecoReport,
  recommendParenteralNutritionByAi,
  type AiParenteralNutritionRecoInputV14,
} from "../aggregators/emrAiParenteralNutritionRecoV14Aggregator.js";

export const emrAiParenteralNutritionRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-parenteral-nutrition-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-parenteral-nutrition-reco:read");
      if (denied) return denied;
      const base = buildAiParenteralNutritionReco("RECB081", "营养科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-parenteral-nutrition-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-parenteral-nutrition-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiParenteralNutritionRecoInputV14 = {
        days: Number(obj?.days ?? 0),
        hasLiverDysfunction: Boolean(obj?.hasLiverDysfunction ?? false),
      };
      const result = recommendParenteralNutritionByAi(input);
      const report = buildAiParenteralNutritionRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
