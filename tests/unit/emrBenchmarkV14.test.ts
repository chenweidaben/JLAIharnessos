/**
 * 健澜科技 jlmedaios - 病历质控指标对标分析 V14 单测（M471-C）
 *
 * 测试 compareToBenchmark 差距方向、buildGapAnalysis 改进建议、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildGapAnalysis,
  compareToBenchmark,
} from "../../src/bff/aggregators/emrBenchmarkV14Aggregator";
import { emrBenchmarkV14Routes } from "../../src/bff/routes/emrBenchmarkV14";
import type { RouteDef } from "../../src/bff/types";

describe("compareToBenchmark above", () => {
  // 手算：current=95, benchmark=90 → gap = 95-90 = 5 > 0 → direction='above'
  it("current=95, benchmark=90 → gap=5，direction='above'", () => {
    const result = compareToBenchmark(95, 90);
    expect(result.gap).toBe(5);
    expect(result.direction).toBe("above");
  });
});

describe("compareToBenchmark below", () => {
  // 手算：current=85, benchmark=90 → gap = 85-90 = -5 < 0 → direction='below'
  it("current=85, benchmark=90 → gap=-5，direction='below'", () => {
    const result = compareToBenchmark(85, 90);
    expect(result.gap).toBe(-5);
    expect(result.direction).toBe("below");
  });
});

describe("compareToBenchmark equal", () => {
  // 手算：current=90, benchmark=90 → gap = 90-90 = 0 → direction='equal'
  it("current=90, benchmark=90 → gap=0，direction='equal'", () => {
    const result = compareToBenchmark(90, 90);
    expect(result.gap).toBe(0);
    expect(result.direction).toBe("equal");
  });
});

describe("buildGapAnalysis 保持优势", () => {
  // 手算：gap=5 > 0 → suggestion 含"保持优势"
  it("gap=5 → suggestion 含'保持优势'", () => {
    const analysis = buildGapAnalysis({ gap: 5 });
    expect(analysis.suggestion).toContain("保持优势");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-benchmark auth:true", () => {
    const def = (emrBenchmarkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-benchmark");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
