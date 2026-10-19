/**
 * 健澜科技 jlmedaios - 病历AI急诊分诊分级推荐 V14 路由（M560-A）
 *
 * GET  /api/v1/emr-ai-emergency-triage-reco  （read，auth:true）返回 AI 急诊分诊分级推荐基础数据
 * POST /api/v1/emr-ai-emergency-triage-reco  （auth:true）AI 急诊分诊分级推荐 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiEmergencyTriageReco,
  buildAiEmergencyTriageRecoReport,
  recommendEmergencyTriageByAi,
  type AiEmergencyTriageRecoInputV14,
} from "../aggregators/emrAiEmergencyTriageRecoV14Aggregator.js";

export const emrAiEmergencyTriageRecoV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-emergency-triage-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-emergency-triage-reco:read");
      if (denied) return denied;
      const base = buildAiEmergencyTriageReco("RECB062", "急诊科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-emergency-triage-reco",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-emergency-triage-reco:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiEmergencyTriageRecoInputV14 = {
        symptom: String(obj?.symptom ?? ""),
        vitalAbnormal: Boolean(obj?.vitalAbnormal ?? false),
      };
      const result = recommendEmergencyTriageByAi(input);
      const report = buildAiEmergencyTriageRecoReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
