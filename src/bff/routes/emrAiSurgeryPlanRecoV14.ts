/**
 * 健澜科技 jlmedaios - 病历AI手术方案推荐 V14 路由（M562-B）
 *
 * GET  /api/v1/emr-ai-surgery-plan-reco  （read，auth:true）返回 AI 手术方案推荐基础数据
 * POST /api/v1/emr-ai-surgery-plan-reco  （auth:true）AI 手术方案推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiSurgeryPlanReco,
  buildAiSurgeryPlanRecoReport,
  recommendSurgeryPlanByAi,
  type AiSurgeryPlanRecoInputV14,
} from "../aggregators/emrAiSurgeryPlanRecoV14Aggregator.js";

export const emrAiSurgeryPlanRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-surgery-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-surgery-plan-reco:read");
      if (denied) return denied;
      const base = buildAiSurgeryPlanReco("RECB071", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-surgery-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-surgery-plan-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiSurgeryPlanRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        severity: String(obj?.severity ?? ""),
      };
      const result = recommendSurgeryPlanByAi(input);
      const report = buildAiSurgeryPlanRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
