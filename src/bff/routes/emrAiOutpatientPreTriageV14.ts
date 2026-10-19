/**
 * 健澜科技 jlmedaios - 病历AI门诊预检分诊 V14 路由（M560-B）
 *
 * GET  /api/v1/emr-ai-outpatient-pre-triage  （read，auth:true）返回 AI 门诊预检分诊基础数据
 * POST /api/v1/emr-ai-outpatient-pre-triage  （auth:true）AI 门诊预检分诊 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiOutpatientPreTriage,
  buildAiOutpatientPreTriageReport,
  preTriageOutpatientByAi,
  type AiOutpatientPreTriageInputV14,
} from "../aggregators/emrAiOutpatientPreTriageV14Aggregator.js";

export const emrAiOutpatientPreTriageV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-outpatient-pre-triage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-outpatient-pre-triage:read");
      if (denied) return denied;
      const base = buildAiOutpatientPreTriage("RECB063", "门诊部");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-outpatient-pre-triage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-outpatient-pre-triage:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiOutpatientPreTriageInputV14 = {
        symptom: String(obj?.symptom ?? ""),
        fever: Boolean(obj?.fever ?? false),
      };
      const result = preTriageOutpatientByAi(input);
      const report = buildAiOutpatientPreTriageReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
