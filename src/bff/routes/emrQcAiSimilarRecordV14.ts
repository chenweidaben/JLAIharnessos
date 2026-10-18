/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐 V14 路由（M499-C）
 *
 * GET /api/v1/emr-qc-ai-similar-record  （read，auth:true）返回相似病历推荐
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSimilarReport, recommendSimilar } from "../aggregators/emrQcAiSimilarRecordV14Aggregator.js";

const sampleCandidates = [
  { id: "R002", dept: "内科", score: 0.9 },
  { id: "R003", dept: "外科", score: 0.7 },
  { id: "R004", dept: "儿科", score: 0.85 },
];

export const emrQcAiSimilarRecordV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-ai-similar-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-similar-record:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const recordId = url.searchParams.get("recordId") ?? "R001";
      const records = recommendSimilar(recordId, sampleCandidates);
      const report = buildSimilarReport(records);
      return json(ok({ records, report }));
    },
  },
];
