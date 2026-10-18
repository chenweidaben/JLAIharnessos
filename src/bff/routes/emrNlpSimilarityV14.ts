/**
 * 健澜科技 jlmedaios - NLP 病历相似度计算 V14 路由（M491-D，M491 收官）
 *
 * POST /api/v1/emr-nlp-similarity  （auth:true，body 用 await c.req.json()）返回相似度结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { calculateMedicalSimilarity, buildSimilarityReport } from "../aggregators/emrNlpSimilarityV14Aggregator.js";

export const emrNlpSimilarityV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-nlp-similarity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-nlp-similarity:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        textA?: string;
        textB?: string;
      };
      const textA = body.textA ?? "";
      const textB = body.textB ?? "";
      const result = calculateMedicalSimilarity(textA, textB);
      const report = buildSimilarityReport(result);
      return json(ok({ result, report }));
    },
  },
];
