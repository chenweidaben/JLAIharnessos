/**
 * 健澜科技 jlmedaios - 病历AI膳食处方推荐 V14 路由（M564-B）
 *
 * GET  /api/v1/emr-ai-diet-script-reco  （read，auth:true）返回 AI 膳食处方推荐基础数据
 * POST /api/v1/emr-ai-diet-script-reco  （auth:true）AI 膳食处方推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDietScriptReco,
  buildAiDietScriptRecoReport,
  recommendDietScriptByAi,
  type AiDietScriptRecoInputV14,
} from "../aggregators/emrAiDietScriptRecoV14Aggregator.js";

export const emrAiDietScriptRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-diet-script-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-diet-script-reco:read");
      if (denied) return denied;
      const base = buildAiDietScriptReco("RECB079", "营养科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-diet-script-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-diet-script-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDietScriptRecoInputV14 = {
        disease: String(obj?.disease ?? ""),
        calorieNeeds: Number(obj?.calorieNeeds ?? 0),
      };
      const result = recommendDietScriptByAi(input);
      const report = buildAiDietScriptRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
