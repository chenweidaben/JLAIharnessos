/**
 * 健澜科技 jlmedaios - 质控护士评分 V14 路由（M494-B）
 *
 * GET /api/v1/emr-qc-nurse-score  （read，auth:true）返回护士评分数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildNurseScore, aggregateNurseScores } from "../aggregators/emrQcNurseScoreV14Aggregator.js";

const sampleScores = [
  { nurse: "王护士", ward: "内科病房", score: 90 },
  { nurse: "张护士", ward: "外科病房", score: 88 },
  { nurse: "刘护士", ward: "儿科病房", score: 92 },
];

export const emrQcNurseScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-nurse-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nurse-score:read");
      if (denied) return denied;
      const scores = sampleScores.map((s) => buildNurseScore(s.nurse, s.ward, s.score));
      const aggregate = aggregateNurseScores(sampleScores);
      return json(ok({ scores, aggregate }));
    },
  },
];
