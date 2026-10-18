/**
 * 健澜科技 jlmedaios - 质控科室主任评分 V14 路由（M494-C）
 *
 * GET /api/v1/emr-qc-director-score  （read，auth:true）返回主任评分数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDirectorScore, aggregateDirectorScores } from "../aggregators/emrQcDirectorScoreV14Aggregator.js";

const sampleScores = [
  { director: "陈主任", dept: "内科", score: 95 },
  { director: "王主任", dept: "外科", score: 90 },
  { director: "赵主任", dept: "儿科", score: 92 },
];

export const emrQcDirectorScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-director-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-director-score:read");
      if (denied) return denied;
      const scores = sampleScores.map((s) => buildDirectorScore(s.director, s.dept, s.score));
      const aggregate = aggregateDirectorScores(sampleScores);
      return json(ok({ scores, aggregate }));
    },
  },
];
