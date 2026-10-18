/**
 * 健澜科技 jlmedaios - NLP 病历标准化 V14 路由（M491-B）
 *
 * POST /api/v1/emr-nlp-normalization  （auth:true，body 用 await c.req.json()）返回标准化结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { normalizeMedicalText, buildNormalizationReport } from "../aggregators/emrNlpNormalizationV14Aggregator.js";

export const emrNlpNormalizationV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-normalization",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-normalization:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = normalizeMedicalText(content);
      const report = buildNormalizationReport(result);
      return json(ok({ result, report }));
    },
  },
];
