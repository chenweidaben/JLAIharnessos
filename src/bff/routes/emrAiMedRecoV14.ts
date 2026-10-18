/**
 * 健澜科技 jlmedaios - 病历AI用药建议 V14 路由（M545-C）
 *
 * GET  /api/v1/emr-ai-med-reco  （read，auth:true）返回 AI 用药建议基础数据
 * POST /api/v1/emr-ai-med-reco  （auth:true）AI 用药建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiMedReco,
  buildAiMedRecoReport,
  recommendMedByAi,
  type AiMedRecoInputV14,
} from "../aggregators/emrAiMedRecoV14Aggregator.js";

export const emrAiMedRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-med-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-med-reco:read");
      if (denied) return denied;
      const base = buildAiMedReco("RECB003", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-med-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-med-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiMedRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        age: Number(obj?.age ?? 0),
      };
      const result = recommendMedByAi(input);
      const report = buildAiMedRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
