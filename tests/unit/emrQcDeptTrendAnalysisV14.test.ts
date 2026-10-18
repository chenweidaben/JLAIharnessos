/**
 * 健澜科技 jlmedaios - 质控科室趋势分析 V14 单测（M501-B）
 *
 * 测试 buildDeptTrend 构建、aggregateDeptTrend 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateDeptTrend,
  buildDeptTrend,
  type DeptTrendAnalysisV14,
} from "../../src/bff/aggregators/emrQcDeptTrendAnalysisV14Aggregator";
import { emrQcDeptTrendAnalysisV14Routes } from "../../src/bff/routes/emrQcDeptTrendAnalysisV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptTrend 内科", () => {
  // 手算：dept='内科', monthlyScores=[88,90,92] → 正确构建
  it("dept='内科', monthlyScores=[88,90,92] → 正确构建", () => {
    const trend: DeptTrendAnalysisV14 = buildDeptTrend("内科", [88, 90, 92]);
    expect(trend.dept).toBe("内科");
    expect(trend.monthlyScores).toEqual([88, 90, 92]);
  });
});

describe("aggregateDeptTrend 一升一降", () => {
  // 手算：2 科室（内科[88,90,92]上升, 外科[95,90,85]下降）→ improving=1, declining=1
  it("2 科室 → improving=1, declining=1", () => {
    const trends: DeptTrendAnalysisV14[] = [
      buildDeptTrend("内科", [88, 90, 92]),
      buildDeptTrend("外科", [95, 90, 85]),
    ];
    const result = aggregateDeptTrend(trends);
    expect(result.improving).toBe(1);
    expect(result.declining).toBe(1);
  });
});

describe("aggregateDeptTrend 空数组", () => {
  // 手算：空数组 → improving=0, declining=0
  it("空数组 → improving=0, declining=0", () => {
    const trends: DeptTrendAnalysisV14[] = [];
    const result = aggregateDeptTrend(trends);
    expect(result.improving).toBe(0);
    expect(result.declining).toBe(0);
  });
});

describe("buildDeptTrend 儿科", () => {
  // 手算：dept='儿科', monthlyScores=[85,87,89] → 正确构建
  it("dept='儿科', monthlyScores=[85,87,89] → 正确构建", () => {
    const trend: DeptTrendAnalysisV14 = buildDeptTrend("儿科", [85, 87, 89]);
    expect(trend.dept).toBe("儿科");
    expect(trend.monthlyScores).toEqual([85, 87, 89]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-trend-analysis auth:true", () => {
    const def = (emrQcDeptTrendAnalysisV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-trend-analysis");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
