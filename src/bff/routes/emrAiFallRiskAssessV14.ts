/**
 * 健澜科技 jlmedaios - 病历AI患者跌倒风险评估 V14 路由（M559-D，M559 收官）
 *
 * GET  /api/v1/emr-ai-fall-risk-assess  （read，auth:true）返回 AI 患者跌倒风险评估基础数据
 * POST /api/v1/emr-ai-fall-risk-assess  （auth:true）AI 患者跌倒风险评估 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiFallRiskAssess,
  buildAiFallRiskAssessReport,
  assessFallRiskByAi,
  type AiFallRiskAssessInputV14,
} from "../aggregators/emrAiFallRiskAssessV14Aggregator.js";

export const emrAiFallRiskAssessV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-fall-risk-assess",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-fall-risk-assess:read");
      if (denied) return denied;
      const base = buildAiFallRiskAssess("RECB061", "护理部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-fall-risk-assess",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-fall-risk-assess:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiFallRiskAssessInputV14 = {
        age: Number(obj?.age ?? 0),
        hasDizziness: Boolean(obj?.hasDizziness ?? false),
        hasGaitInstability: Boolean(obj?.hasGaitInstability ?? false),
        sedativeUse: Boolean(obj?.sedativeUse ?? false),
      };
      const result = assessFallRiskByAi(input);
      const report = buildAiFallRiskAssessReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
