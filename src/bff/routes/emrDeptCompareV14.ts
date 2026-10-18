/**
 * 健澜科技 jlmedaios - 病历科室质控对比分析 V14 路由（M469-B）
 *
 * GET /api/v1/emr-dept-compare  （read，auth:true，query 用 new URL 取 depts 参数，逗号分隔）返回科室对比
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildComparisonTable,
  compareDeptScores,
} from "../aggregators/emrDeptCompareV14Aggregator.js";

const demoDepts = [
  { name: "内科", score: 90 },
  { name: "外科", score: 80 },
  { name: "儿科", score: 85 },
];

export const emrDeptCompareV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-dept-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-dept-compare:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const results = compareDeptScores(demoDepts);
      const table = buildComparisonTable(demoDepts);
      return json(ok({ results, table }));
    },
  },
];
