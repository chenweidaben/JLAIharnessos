/**
 * 健澜科技 jlmedaios - 病历AI诊疗方案推荐 V14 路由（M554-C）
 *
 * GET  /api/v1/emr-ai-treatment-plan-reco  （read，auth:true）返回 AI 诊疗方案推荐基础数据
 * POST /api/v1/emr-ai-treatment-plan-reco  （auth:true）AI 诊疗方案推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiTreatmentPlanReco,
  buildAiTreatmentPlanRecoReport,
  recommendTreatmentPlanByAi,
  type AiTreatmentPlanRecoInputV14,
} from "../aggregators/emrAiTreatmentPlanRecoV14Aggregator.js";

export const emrAiTreatmentPlanRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-treatment-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-treatment-plan-reco:read");
      if (denied) return denied;
      const base = buildAiTreatmentPlanReco("RECB039", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-treatment-plan-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-treatment-plan-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiTreatmentPlanRecoInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        severity: String(obj?.severity ?? ""),
      };
      const result = recommendTreatmentPlanByAi(input);
      const report = buildAiTreatmentPlanRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
