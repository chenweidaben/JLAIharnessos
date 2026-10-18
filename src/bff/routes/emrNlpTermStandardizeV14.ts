/**
 * 健澜科技 jlmedaios - 病历 NLP 术语标准化 V14 路由（M531-B）
 *
 * GET  /api/v1/emr-nlp-term-standardize  （read，auth:true）返回术语标准化基础数据
 * POST /api/v1/emr-nlp-term-standardize  （auth:true）术语标准化 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNlpTermStandardize,
  buildNlpTermStandardizeReport,
  standardizeMedicalTerm,
  type NlpTermStandardizeInputV14,
} from "../aggregators/emrNlpTermStandardizeV14Aggregator.js";

export const emrNlpTermStandardizeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-nlp-term-standardize",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-term-standardize:read");
      if (denied) return denied;
      const nlp = buildNlpTermStandardize("药品", "通用名表");
      return json(ok(nlp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-nlp-term-standardize",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-term-standardize:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: NlpTermStandardizeInputV14 = {
        rawTerm: String(obj?.rawTerm ?? ""),
        aliases: (obj?.aliases ?? {}) as Record<string, string>,
      };
      const result = standardizeMedicalTerm(input);
      const report = buildNlpTermStandardizeReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
