/**
 * 健澜科技 jlmedaios - 质控指标对标 V14 路由（M484-B）
 *
 * GET /api/v1/emr-qc-metric-benchmark  （read，auth:true）返回对标数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildBenchmark, compareToBenchmark, type BenchmarkV14 } from "../aggregators/emrQcMetricBenchmarkV14Aggregator.js";

const demoBenchmarks: BenchmarkV14[] = [
  buildBenchmark("完整率", 92, 90),
  buildBenchmark("及时率", 85, 90),
  buildBenchmark("规范率", 90, 90),
];

const demoGaps = demoBenchmarks.map((b) => compareToBenchmark(b.ourValue, b.benchmarkValue));

export const emrQcMetricBenchmarkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-metric-benchmark",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-benchmark:read");
      if (denied) return denied;
      return json(ok({ benchmarks: demoBenchmarks, gaps: demoGaps }));
    },
  },
];
