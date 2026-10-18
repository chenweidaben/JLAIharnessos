/**
 * 健澜科技 jlmedaios - 质控科室对比分析 V14 路由（M501-A）
 *
 * GET /api/v1/emr-qc-dept-compare-analysis  （read，auth:true）返回科室对比分析
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateDeptCompare, buildDeptCompare } from "../aggregators/emrQcDeptCompareAnalysisV14Aggregator.js";

const samplePairs = [
  buildDeptCompare("内科", 92, "外科", 85),
  buildDeptCompare("儿科", 88, "急诊", 95),
];

const aggregate = aggregateDeptCompare(samplePairs);

export const emrQcDeptCompareAnalysisV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-compare-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-compare-analysis:read");
      if (denied) return denied;
      return json(ok({ pairs: samplePairs, aggregate }));
    },
  },
];
