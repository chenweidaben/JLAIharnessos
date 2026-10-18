/**
 * 健澜科技 jlmedaios - 质控季报 V14 单测（M487-C）
 *
 * 测试 buildQuarterlyReport 构建、aggregateQuarterlyMetrics 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQuarterlyReport,
  aggregateQuarterlyMetrics,
  type QuarterlyReportV14,
} from "../../src/bff/aggregators/emrQcQuarterlyReportV14Aggregator";
import { emrQcQuarterlyReportV14Routes } from "../../src/bff/routes/emrQcQuarterlyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQuarterlyReport 3月", () => {
  // 手算：quarter='2026-Q3', 3 月数据 → 正确构建
  it("quarter='2026-Q3', 3 月数据 → 正确构建", () => {
    const metrics = [
      { month: "7月", value: 90 },
      { month: "8月", value: 92 },
      { month: "9月", value: 94 },
    ];
    const report: QuarterlyReportV14 = buildQuarterlyReport("2026-Q3", metrics);
    expect(report.quarter).toBe("2026-Q3");
    expect(report.metrics.length).toBe(3);
  });
});

describe("aggregateQuarterlyMetrics 3月", () => {
  // 手算：3 月值 90/92/94 → (90+92+94)/3=92, maxValue=94
  it("3 月值 90/92/94 → months=3, avgValue=92.0, maxValue=94", () => {
    const metrics = [
      { month: "7月", value: 90 },
      { month: "8月", value: 92 },
      { month: "9月", value: 94 },
    ];
    const result = aggregateQuarterlyMetrics(metrics);
    expect(result.months).toBe(3);
    expect(result.avgValue).toBeCloseTo(92.0);
    expect(result.maxValue).toBe(94);
  });
});

describe("aggregateQuarterlyMetrics 空数组", () => {
  // 手算：空数组 → months=0, avgValue=0
  it("空数组 → months=0, avgValue=0", () => {
    const metrics: { month: string; value: number }[] = [];
    const result = aggregateQuarterlyMetrics(metrics);
    expect(result.months).toBe(0);
    expect(result.avgValue).toBe(0);
  });
});

describe("buildQuarterlyReport 2月", () => {
  // 手算：2 月数据 → 正确构建
  it("2 月数据 → 正确构建", () => {
    const metrics = [
      { month: "7月", value: 90 },
      { month: "8月", value: 92 },
    ];
    const report: QuarterlyReportV14 = buildQuarterlyReport("2026-Q3", metrics);
    expect(report.metrics.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-quarterly-report auth:true", () => {
    const def = (emrQcQuarterlyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-quarterly-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
