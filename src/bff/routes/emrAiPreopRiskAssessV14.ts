/**
 * 健澜科技 jlmedaios - 病历AI术前风险评估 V14 路由（M562-A，手术与麻醉管理系列）
 *
 * GET  /api/v1/emr-ai-preop-risk-assess  （read，auth:true）返回 AI 术前风险评估基础数据
 * POST /api/v1/emr-ai-preop-risk-assess  （auth:true）AI 术前风险评估 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiPreopRiskAssess,
  buildAiPreopRiskAssessReport,
  assessPreopRiskByAi,
  type AiPreopRiskAssessInputV14,
} from "../aggregators/emrAiPreopRiskAssessV14Aggregator.js";

export const emrAiPreopRiskAssessV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-preop-risk-assess",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-preop-risk-assess:read");
      if (denied) return denied;
      const base = buildAiPreopRiskAssess("RECB070", "外科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-preop-risk-assess",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-preop-risk-assess:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiPreopRiskAssessInputV14 = {
        patientAge: Number(obj?.patientAge ?? 0),
        hasHeartDisease: Boolean(obj?.hasHeartDisease ?? false),
        hasHypertension: Boolean(obj?.hasHypertension ?? false),
      };
      const result = assessPreopRiskByAi(input);
      const report = buildAiPreopRiskAssessReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
