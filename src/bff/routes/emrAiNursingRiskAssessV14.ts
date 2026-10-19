/**
 * 健澜科技 jlmedaios - 病历AI护理风险评估 V14 路由（M557-C）
 *
 * GET  /api/v1/emr-ai-nursing-risk-assess  （read，auth:true）返回 AI 护理风险评估基础数据
 * POST /api/v1/emr-ai-nursing-risk-assess  （auth:true）AI 护理风险评估 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiNursingRiskAssess,
  buildAiNursingRiskAssessReport,
  assessNursingRiskByAi,
  type AiNursingRiskAssessInputV14,
} from "../aggregators/emrAiNursingRiskAssessV14Aggregator.js";

export const emrAiNursingRiskAssessV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-nursing-risk-assess",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-risk-assess:read");
      if (denied) return denied;
      const base = buildAiNursingRiskAssess("RECB051", "护理部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-nursing-risk-assess",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-nursing-risk-assess:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiNursingRiskAssessInputV14 = {
        age: Number(obj?.age ?? 0),
        hasFallHistory: Boolean(obj?.hasFallHistory ?? false),
        hasPressureUlcer: Boolean(obj?.hasPressureUlcer ?? false),
        isConfused: Boolean(obj?.isConfused ?? false),
      };
      const result = assessNursingRiskByAi(input);
      const report = buildAiNursingRiskAssessReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
