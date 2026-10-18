/**
 * 健澜科技 jlmedaios - 病历质控指标对标分析 V14 路由（M471-C）
 *
 * GET /api/v1/emr-benchmark  （read，auth:true，query 用 new URL 取 indicator）返回对标结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildGapAnalysis,
  compareToBenchmark,
} from "../aggregators/emrBenchmarkV14Aggregator.js";

export const emrBenchmarkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-benchmark",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-benchmark:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const indicator = url.searchParams.get("indicator") ?? "passRate";
      const result = compareToBenchmark(95, 90);
      const analysis = buildGapAnalysis(result);
      return json(ok({ indicator, result, analysis }));
    },
  },
];
