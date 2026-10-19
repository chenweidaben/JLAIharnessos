/**
 * 健澜科技 jlmedaios - 病历AI特殊人群用药推荐 V14 路由（M565-D，M565 收官）
 *
 * GET  /api/v1/emr-ai-special-population-med-reco  （read，auth:true）返回 AI 特殊人群用药推荐基础数据
 * POST /api/v1/emr-ai-special-population-med-reco  （auth:true）AI 特殊人群用药推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiSpecialPopulationMedReco,
  buildAiSpecialPopulationMedRecoReport,
  recommendSpecialPopulationMedByAi,
  type AiSpecialPopulationMedRecoInputV14,
} from "../aggregators/emrAiSpecialPopulationMedRecoV14Aggregator.js";

export const emrAiSpecialPopulationMedRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-special-population-med-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-special-population-med-reco:read");
      if (denied) return denied;
      const base = buildAiSpecialPopulationMedReco("RECB085", "药剂科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-special-population-med-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-special-population-med-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiSpecialPopulationMedRecoInputV14 = {
        population: String(obj?.population ?? ""),
        drugName: String(obj?.drugName ?? ""),
      };
      const result = recommendSpecialPopulationMedByAi(input);
      const report = buildAiSpecialPopulationMedRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
