/**
 * 健澜科技 jlmedaios - 质控指标对标 V14 单测（M484-B）
 *
 * 测试 buildBenchmark 构建、compareToBenchmark 差距对比、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBenchmark,
  compareToBenchmark,
  type BenchmarkV14,
} from "../../src/bff/aggregators/emrQcMetricBenchmarkV14Aggregator";
import { emrQcMetricBenchmarkV14Routes } from "../../src/bff/routes/emrQcMetricBenchmarkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildBenchmark 构建", () => {
  // 手算：metricName='完整率', ourValue=92, benchmarkValue=90 → 正确构建
  it("metricName=完整率, ourValue=92, benchmarkValue=90 → 正确构建", () => {
    const benchmark: BenchmarkV14 = buildBenchmark("完整率", 92, 90);
    expect(benchmark.metricName).toBe("完整率");
    expect(benchmark.ourValue).toBe(92);
    expect(benchmark.benchmarkValue).toBe(90);
  });
});

describe("compareToBenchmark 优于", () => {
  // 手算：ourValue=92, benchmarkValue=90 → 92-90=2 → gap=2, status='above'
  it("ourValue=92, benchmarkValue=90 → gap=2, status=above", () => {
    const result = compareToBenchmark(92, 90);
    expect(result.gap).toBe(2);
    expect(result.status).toBe("above");
  });
});

describe("compareToBenchmark 劣于", () => {
  // 手算：ourValue=85, benchmarkValue=90 → 85-90=-5 → gap=-5, status='below'
  it("ourValue=85, benchmarkValue=90 → gap=-5, status=below", () => {
    const result = compareToBenchmark(85, 90);
    expect(result.gap).toBe(-5);
    expect(result.status).toBe("below");
  });
});

describe("compareToBenchmark 持平", () => {
  // 手算：ourValue=90, benchmarkValue=90 → 90-90=0 → gap=0, status='equal'
  it("ourValue=90, benchmarkValue=90 → gap=0, status=equal", () => {
    const result = compareToBenchmark(90, 90);
    expect(result.gap).toBe(0);
    expect(result.status).toBe("equal");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-metric-benchmark auth:true", () => {
    const def = (emrQcMetricBenchmarkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-metric-benchmark");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
