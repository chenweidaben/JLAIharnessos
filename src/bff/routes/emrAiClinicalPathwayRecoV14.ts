/**
 * 健澜科技 jlmedaios - 病历AI临床路径推荐 V14 路由（M554-A）
 *
 * GET  /api/v1/emr-ai-clinical-pathway-reco  （read，auth:true）返回 AI 临床路径推荐基础数据
 * POST /api/v1/emr-ai-clinical-pathway-reco  （auth:true）AI 临床路径推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiClinicalPathwayReco,
  buildAiClinicalPathwayRecoReport,
  recommendClinicalPathwayByAi,
  type AiClinicalPathwayRecoInputV14,
} from "../aggregators/emrAiClinicalPathwayRecoV14Aggregator.js";

export const emrAiClinicalPathwayRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-clinical-pathway-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-pathway-reco:read");
      if (denied) return denied;
      const base = buildAiClinicalPathwayReco("RECB037", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-clinical-pathway-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-pathway-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiClinicalPathwayRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        age: Number(obj?.age ?? 0),
      };
      const result = recommendClinicalPathwayByAi(input);
      const report = buildAiClinicalPathwayRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
