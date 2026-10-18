/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐明细 V14 路由（M508-C，-detail 避让）
 *
 * POST /api/v1/emr-qc-ai-similar-record-detail  （auth:true）AI 推荐提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSimilarReport,
  recommendSimilar,
  type AiSimilarRecordResultDetailV14,
} from "../aggregators/emrQcAiSimilarRecordDetailV14Aggregator.js";

export const emrQcAiSimilarRecordDetailV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-ai-similar-record-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-similar-record-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const diagnosis = typeof body?.diagnosis === "string" ? body.diagnosis : "";
      const result: AiSimilarRecordResultDetailV14 = recommendSimilar(diagnosis);
      const report = buildSimilarReport(result);
      return json(ok({ result, report }));
    },
  },
];
