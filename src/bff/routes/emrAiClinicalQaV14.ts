/**
 * 健澜科技 jlmedaios - 病历AI临床问答 V14 路由（M545-A）
 *
 * GET  /api/v1/emr-ai-clinical-qa  （read，auth:true）返回 AI 临床问答基础数据
 * POST /api/v1/emr-ai-clinical-qa  （auth:true）临床问答 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiClinicalQa,
  buildAiClinicalQaReport,
  askClinicalQa,
  type AiClinicalQaInputV14,
} from "../aggregators/emrAiClinicalQaV14Aggregator.js";

export const emrAiClinicalQaV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-clinical-qa",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-qa:read");
      if (denied) return denied;
      const base = buildAiClinicalQa("RECB001", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-clinical-qa",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-clinical-qa:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiClinicalQaInputV14 = {
        question: String(obj?.question ?? ""),
      };
      const result = askClinicalQa(input);
      const report = buildAiClinicalQaReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
