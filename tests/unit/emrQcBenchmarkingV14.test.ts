/**
 * 健澜科技 jlmedaios - 质控标杆管理 V14 单测（M504-C）
 *
 * 测试 buildBenchmark 构建、compareBenchmark 对比、buildBenchmarkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBenchmark,
  buildBenchmarkReport,
  compareBenchmark,
  type BenchmarkingV14,
} from "../../src/bff/aggregators/emrQcBenchmarkingV14Aggregator";
import { emrQcBenchmarkingV14Routes } from "../../src/bff/routes/emrQcBenchmarkingV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildBenchmark 内科", () => {
  // 手算：dept='内科', score=92, benchmark=90 → 正确构建
  it("dept='内科', score=92, benchmark=90 → 正确构建", () => {
    const data: BenchmarkingV14 = buildBenchmark("内科", 92, 90);
    expect(data.dept).toBe("内科");
    expect(data.score).toBe(92);
    expect(data.benchmark).toBe(90);
  });
});

describe("compareBenchmark 达标", () => {
  // 手算：deptScore=92, benchmark=90 → gap=2（92-90=2）, achieved=true（2>=0）
  it("deptScore=92, benchmark=90 → gap=2, achieved=true", () => {
    const result = compareBenchmark(92, 90);
    expect(result.gap).toBe(2);
    expect(result.achieved).toBe(true);
  });
});

describe("compareBenchmark 未达标", () => {
  // 手算：deptScore=85, benchmark=90 → gap=-5（85-90=-5）, achieved=false（-5<0）
  it("deptScore=85, benchmark=90 → gap=-5, achieved=false", () => {
    const result = compareBenchmark(85, 90);
    expect(result.gap).toBe(-5);
    expect(result.achieved).toBe(false);
  });
});

describe("buildBenchmarkReport 外科未达标", () => {
  // 手算：{dept:'外科', score=85, benchmark=90} + {gap:-5, achieved:false} → 正确构建
  it("{dept:'外科', score=85, benchmark=90} + {gap:-5, achieved:false} → 正确构建", () => {
    const b: BenchmarkingV14 = buildBenchmark("外科", 85, 90);
    const c = compareBenchmark(85, 90);
    const report = buildBenchmarkReport(b, c);
    expect(report.dept).toBe("外科");
    expect(report.gap).toBe(-5);
    expect(report.achieved).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-benchmarking auth:true", () => {
    const def = (emrQcBenchmarkingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-benchmarking");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
