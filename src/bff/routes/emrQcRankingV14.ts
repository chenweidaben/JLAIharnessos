/**
 * 健澜科技 jlmedaios - 科室病历质控评分排名 V14 路由（M461-D，M461 收官）
 *
 * GET /api/v1/emr-qc-ranking （read，auth:true）返回排名列表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  rankDepts,
  type DeptQcItemV14,
} from "../aggregators/emrQcRankingV14Aggregator.js";

const demoItems: DeptQcItemV14[] = [
  { dept: "心内科", passed: 95, block: 0, major: 1, minor: 2 },
  { dept: "普外科", passed: 88, block: 1, major: 2, minor: 3 },
  { dept: "骨科", passed: 75, block: 2, major: 3, minor: 5 },
];

export const emrQcRankingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-ranking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ranking:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ ranking: rankDepts(demoItems) }));
    },
  },
];
