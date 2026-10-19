/**
 * 健澜科技 jlmedaios - 病历AI术前评估智能推荐 V14 路由（M562-A）
 *
 * GET  /api/v1/emr-ai-preop-assess-reco  （read，auth:true）返回 AI 术前评估智能推荐基础数据
 * POST /api/v1/emr-ai-preop-assess-reco  （auth:true）AI 术前评估智能推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiPreopAssessReco,
  buildAiPreopAssessRecoReport,
  recommendPreopAssessByAi,
  type AiPreopAssessRecoInputV14,
} from "../aggregators/emrAiPreopAssessRecoV14Aggregator.js";

export const emrAiPreopAssessRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-preop-assess-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-preop-assess-reco:read");
      if (denied) return denied;
      const base = buildAiPreopAssessReco("RECB070", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-preop-assess-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-preop-assess-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiPreopAssessRecoInputV14 = {
        patientAge: Number(obj?.patientAge ?? 0),
        hasHeartDisease: Boolean(obj?.hasHeartDisease ?? false),
        hasDiabetes: Boolean(obj?.hasDiabetes ?? false),
      };
      const result = recommendPreopAssessByAi(input);
      const report = buildAiPreopAssessRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
