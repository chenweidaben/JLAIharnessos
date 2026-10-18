/**
 * 健澜科技 jlmedaios - 病历AI临床路径推荐 V14 路由（M546-A）
 *
 * GET  /api/v1/emr-ai-pathway-reco  （read，auth:true）返回 AI 临床路径推荐基础数据
 * POST /api/v1/emr-ai-pathway-reco  （auth:true）AI 临床路径推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiPathwayReco,
  buildAiPathwayRecoReport,
  recommendPathwayByAi,
  type AiPathwayRecoInputV14,
} from "../aggregators/emrAiPathwayRecoV14Aggregator.js";

export const emrAiPathwayRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-pathway-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-pathway-reco:read");
      if (denied) return denied;
      const base = buildAiPathwayReco("RECB005", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-pathway-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-pathway-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiPathwayRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
      };
      const result = recommendPathwayByAi(input);
      const report = buildAiPathwayRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
