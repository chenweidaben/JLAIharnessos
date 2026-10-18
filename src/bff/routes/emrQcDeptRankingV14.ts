/**
 * 健澜科技 jlmedaios - 质控科室排名 V14 路由（M493-C）
 *
 * GET /api/v1/emr-qc-dept-ranking  （read，auth:true）返回排名数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { rankDepts, type DeptScoreV14 } from "../aggregators/emrQcDeptRankingV14Aggregator.js";

const sampleDepts: DeptScoreV14[] = [
  { dept: "内科", score: 92 },
  { dept: "外科", score: 85 },
  { dept: "儿科", score: 95 },
];

export const emrQcDeptRankingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-ranking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-ranking:read");
      if (denied) return denied;
      const rankings = rankDepts(sampleDepts);
      return json(ok({ rankings }));
    },
  },
];
