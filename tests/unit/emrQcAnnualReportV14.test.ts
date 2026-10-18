/**
 * 健澜科技 jlmedaios - 质控年报 V14 单测（M487-D，M487 收官）
 *
 * 测试 buildAnnualReport 构建、aggregateAnnualMetrics 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAnnualReport,
  aggregateAnnualMetrics,
  type AnnualReportV14,
} from "../../src/bff/aggregators/emrQcAnnualReportV14Aggregator";
import { emrQcAnnualReportV14Routes } from "../../src/bff/routes/emrQcAnnualReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAnnualReport 4季", () => {
  // 手算：year='2026', 4 季数据 → 正确构建
  it("year='2026', 4 季数据 → 正确构建", () => {
    const metrics = [
      { quarter: "Q1", value: 88 },
      { quarter: "Q2", value: 90 },
      { quarter: "Q3", value: 92 },
      { quarter: "Q4", value: 94 },
    ];
    const report: AnnualReportV14 = buildAnnualReport("2026", metrics);
    expect(report.year).toBe("2026");
    expect(report.metrics.length).toBe(4);
  });
});

describe("aggregateAnnualMetrics 4季", () => {
  // 手算：4 季值 88/90/92/94 → (88+90+92+94)/4=364/4=91, maxValue=94
  it("4 季值 88/90/92/94 → quarters=4, avgValue=91.0, maxValue=94", () => {
    const metrics = [
      { quarter: "Q1", value: 88 },
      { quarter: "Q2", value: 90 },
      { quarter: "Q3", value: 92 },
      { quarter: "Q4", value: 94 },
    ];
    const result = aggregateAnnualMetrics(metrics);
    expect(result.quarters).toBe(4);
    expect(result.avgValue).toBeCloseTo(91.0);
    expect(result.maxValue).toBe(94);
  });
});

describe("aggregateAnnualMetrics 空数组", () => {
  // 手算：空数组 → quarters=0, avgValue=0
  it("空数组 → quarters=0, avgValue=0", () => {
    const metrics: { quarter: string; value: number }[] = [];
    const result = aggregateAnnualMetrics(metrics);
    expect(result.quarters).toBe(0);
    expect(result.avgValue).toBe(0);
  });
});

describe("buildAnnualReport 2季", () => {
  // 手算：2 季数据 → 正确构建
  it("2 季数据 → 正确构建", () => {
    const metrics = [
      { quarter: "Q1", value: 88 },
      { quarter: "Q2", value: 90 },
    ];
    const report: AnnualReportV14 = buildAnnualReport("2026", metrics);
    expect(report.metrics.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-annual-report auth:true", () => {
    const def = (emrQcAnnualReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-annual-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
