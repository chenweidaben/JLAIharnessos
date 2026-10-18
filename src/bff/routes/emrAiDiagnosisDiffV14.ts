/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断支持 V14 路由（M550-B）
 *
 * GET  /api/v1/emr-ai-diagnosis-diff  （read，auth:true）返回 AI 鉴别诊断基础数据
 * POST /api/v1/emr-ai-diagnosis-diff  （auth:true）AI 鉴别诊断支持 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDiagnosisDiff,
  buildAiDiagnosisDiffReport,
  diffDiagnosisByAi,
  type AiDiagnosisDiffInputV14,
} from "../aggregators/emrAiDiagnosisDiffV14Aggregator.js";

export const emrAiDiagnosisDiffV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-diagnosis-diff",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-diagnosis-diff:read");
      if (denied) return denied;
      const base = buildAiDiagnosisDiff("RECB022", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-diagnosis-diff",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-diagnosis-diff:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDiagnosisDiffInputV14 = {
        symptom: String(obj?.symptom ?? ""),
        age: Number(obj?.age ?? 0),
      };
      const result = diffDiagnosisByAi(input);
      const report = buildAiDiagnosisDiffReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
