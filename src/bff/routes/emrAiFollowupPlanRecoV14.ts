/**
 * 健澜科技 jlmedaios - 病历AI随访计划推荐 V14 路由（M546-D，M546 收官）
 *
 * GET  /api/v1/emr-ai-followup-plan-reco  （read，auth:true）返回 AI 随访计划推荐基础数据
 * POST /api/v1/emr-ai-followup-plan-reco  （auth:true）AI 随访计划推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiFollowupPlanReco,
  buildAiFollowupPlanRecoReport,
  recommendFollowupPlanByAi,
  type AiFollowupPlanRecoInputV14,
} from "../aggregators/emrAiFollowupPlanRecoV14Aggregator.js";

export const emrAiFollowupPlanRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-followup-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-followup-plan-reco:read");
      if (denied) return denied;
      const base = buildAiFollowupPlanReco("RECB008", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-followup-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-followup-plan-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiFollowupPlanRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        daysAfterDischarge: Number(obj?.daysAfterDischarge ?? 0),
      };
      const result = recommendFollowupPlanByAi(input);
      const report = buildAiFollowupPlanRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
