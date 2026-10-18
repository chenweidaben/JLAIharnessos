/**
 * 健澜科技 jlmedaios - AI 病历相似病历推荐 V14 路由（M486-D，M486 收官）
 *
 * POST /api/v1/emr-ai-similar  （auth:true，body 用 await c.req.json()）返回相似病历推荐
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { findSimilarCases, buildSimilarReport } from "../aggregators/emrAiSimilarV14Aggregator.js";

export const emrAiSimilarV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-ai-similar",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-similar:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        currentDiagnosis?: string;
        allCases?: { id: string; diagnosis: string }[];
      };
      const currentDiagnosis = body.currentDiagnosis ?? "";
      const allCases = body.allCases ?? [];
      const result = findSimilarCases(currentDiagnosis, allCases);
      const report = buildSimilarReport(result);
      return json(ok({ result, report }));
    },
  },
];
