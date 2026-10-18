/**
 * 健澜科技 jlmedaios - NLP 病历纠错 V14 路由（M491-A）
 *
 * POST /api/v1/emr-nlp-correction  （auth:true，body 用 await c.req.json()）返回纠错结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { correctMedicalText, buildCorrectionReport } from "../aggregators/emrNlpCorrectionV14Aggregator.js";

export const emrNlpCorrectionV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-correction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-correction:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = correctMedicalText(content);
      const report = buildCorrectionReport(result);
      return json(ok({ result, report }));
    },
  },
];
