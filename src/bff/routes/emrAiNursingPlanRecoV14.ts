/**
 * 健澜科技 jlmedaios - 病历AI护理计划推荐 V14 路由（M557-B）
 *
 * GET  /api/v1/emr-ai-nursing-plan-reco  （read，auth:true）返回 AI 护理计划推荐基础数据
 * POST /api/v1/emr-ai-nursing-plan-reco  （auth:true）AI 护理计划推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiNursingPlanReco,
  buildAiNursingPlanRecoReport,
  recommendNursingPlanByAi,
  type AiNursingPlanRecoInputV14,
} from "../aggregators/emrAiNursingPlanRecoV14Aggregator.js";

export const emrAiNursingPlanRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-nursing-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-plan-reco:read");
      if (denied) return denied;
      const base = buildAiNursingPlanReco("RECB050", "护理部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-nursing-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-plan-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiNursingPlanRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
      };
      const result = recommendNursingPlanByAi(input);
      const report = buildAiNursingPlanRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
