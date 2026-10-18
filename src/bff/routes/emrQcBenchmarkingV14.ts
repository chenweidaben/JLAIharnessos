/**
 * 健澜科技 jlmedaios - 质控标杆管理 V14 路由（M504-C）
 *
 * GET /api/v1/emr-qc-benchmarking  （read，auth:true）返回标杆管理数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildBenchmark, buildBenchmarkReport, compareBenchmark, type BenchmarkingV14 } from "../aggregators/emrQcBenchmarkingV14Aggregator.js";

const sampleData: BenchmarkingV14[] = [
  buildBenchmark("内科", 92, 90),
  buildBenchmark("外科", 85, 90),
  buildBenchmark("儿科", 88, 90),
];

const reports = sampleData.map((b) => {
  const c = compareBenchmark(b.score, b.benchmark);
  return buildBenchmarkReport(b, c);
});

export const emrQcBenchmarkingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-benchmarking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-benchmarking:read");
      if (denied) return denied;
      return json(ok({ data: sampleData, reports }));
    },
  },
];
