/**
 * 健澜科技 jlmedaios - 病历AI康复评估推荐 V14 路由（M563-A）
 *
 * GET  /api/v1/emr-ai-rehab-assess-reco  （read，auth:true）返回 AI 康复评估推荐基础数据
 * POST /api/v1/emr-ai-rehab-assess-reco  （auth:true）AI 康复评估推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRehabAssessReco,
  buildAiRehabAssessRecoReport,
  recommendRehabAssessByAi,
  type AiRehabAssessRecoInputV14,
} from "../aggregators/emrAiRehabAssessRecoV14Aggregator.js";

export const emrAiRehabAssessRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-rehab-assess-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-rehab-assess-reco:read");
      if (denied) return denied;
      const base = buildAiRehabAssessReco("RECB074", "康复科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-rehab-assess-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-rehab-assess-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRehabAssessRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        mobility: String(obj?.mobility ?? ""),
      };
      const result = recommendRehabAssessByAi(input);
      const report = buildAiRehabAssessRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
