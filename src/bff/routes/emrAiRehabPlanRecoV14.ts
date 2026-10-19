/**
 * 健澜科技 jlmedaios - 病历AI康复训练方案推荐 V14 路由（M563-B）
 *
 * GET  /api/v1/emr-ai-rehab-plan-reco  （read，auth:true）返回 AI 康复训练方案推荐基础数据
 * POST /api/v1/emr-ai-rehab-plan-reco  （auth:true）AI 康复训练方案推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRehabPlanReco,
  buildAiRehabPlanRecoReport,
  recommendRehabPlanByAi,
  type AiRehabPlanRecoInputV14,
} from "../aggregators/emrAiRehabPlanRecoV14Aggregator.js";

export const emrAiRehabPlanRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-rehab-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-rehab-plan-reco:read");
      if (denied) return denied;
      const base = buildAiRehabPlanReco("RECB075", "康复科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-rehab-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-rehab-plan-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRehabPlanRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        rehabLevel: String(obj?.rehabLevel ?? ""),
      };
      const result = recommendRehabPlanByAi(input);
      const report = buildAiRehabPlanRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
