/**
 * 健澜科技 jlmedaios - 质控知识置信度评估 V14 路由（M489-D，M489 收官）
 *
 * GET /api/v1/emr-qc-confidence  （read，auth:true）返回置信度数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateConfidence, buildConfidenceScore } from "../aggregators/emrQcConfidenceV14Aggregator.js";

const sampleScores = [
  { ruleName: "糖尿病诊断规则", score: 95 },
  { ruleName: "高血压用药规则", score: 88 },
  { ruleName: "抗菌药物使用规则", score: 90 },
];

export const emrQcConfidenceV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-confidence",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-confidence:read");
      if (denied) return denied;
      const scores = sampleScores.map((s) => buildConfidenceScore(s.ruleName, s.score));
      const aggregate = aggregateConfidence(scores);
      return json(ok({ scores, aggregate }));
    },
  },
];
