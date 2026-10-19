/**
 * 健澜科技 jlmedaios - 病历AI临床指南推荐 V14 路由（M554-D，M554 收官）
 *
 * GET  /api/v1/emr-ai-clinical-guideline-reco  （read，auth:true）返回 AI 临床指南推荐基础数据
 * POST /api/v1/emr-ai-clinical-guideline-reco  （auth:true）AI 临床指南推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiClinicalGuidelineReco,
  buildAiClinicalGuidelineRecoReport,
  recommendClinicalGuidelineByAi,
  type AiClinicalGuidelineRecoInputV14,
} from "../aggregators/emrAiClinicalGuidelineRecoV14Aggregator.js";

export const emrAiClinicalGuidelineRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-clinical-guideline-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-guideline-reco:read");
      if (denied) return denied;
      const base = buildAiClinicalGuidelineReco("RECB040", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-clinical-guideline-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-guideline-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiClinicalGuidelineRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        specialty: String(obj?.specialty ?? ""),
      };
      const result = recommendClinicalGuidelineByAi(input);
      const report = buildAiClinicalGuidelineRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
