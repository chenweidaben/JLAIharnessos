/**
 * 健澜科技 jlmedaios - 质控日报 V14 单测（M487-A）
 *
 * 测试 buildDailyReport 构建、aggregateDailyMetrics 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDailyReport,
  aggregateDailyMetrics,
  type DailyReportV14,
} from "../../src/bff/aggregators/emrQcDailyReportV14Aggregator";
import { emrQcDailyReportV14Routes } from "../../src/bff/routes/emrQcDailyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDailyReport 3指标", () => {
  // 手算：date='2026-10-18', 3 个指标 → 正确构建
  it("date='2026-10-18', 3 个指标 → 正确构建", () => {
    const metrics = [
      { name: "甲级率", value: 95 },
      { name: "乙级率", value: 85 },
      { name: "丙级率", value: 90 },
    ];
    const report: DailyReportV14 = buildDailyReport("2026-10-18", metrics);
    expect(report.date).toBe("2026-10-18");
    expect(report.metrics.length).toBe(3);
  });
});

describe("aggregateDailyMetrics 3指标", () => {
  // 手算：3 个指标值 95/85/90 → (95+85+90)/3=90
  it("3 个指标值 95/85/90 → count=3, avgValue=90.0", () => {
    const metrics = [
      { name: "甲级率", value: 95 },
      { name: "乙级率", value: 85 },
      { name: "丙级率", value: 90 },
    ];
    const result = aggregateDailyMetrics(metrics);
    expect(result.count).toBe(3);
    expect(result.avgValue).toBeCloseTo(90.0);
  });
});

describe("aggregateDailyMetrics 空数组", () => {
  // 手算：空数组 → count=0, avgValue=0
  it("空数组 → count=0, avgValue=0", () => {
    const metrics: { name: string; value: number }[] = [];
    const result = aggregateDailyMetrics(metrics);
    expect(result.count).toBe(0);
    expect(result.avgValue).toBe(0);
  });
});

describe("buildDailyReport 1指标", () => {
  // 手算：1 个指标 → 正确构建
  it("1 个指标 → 正确构建", () => {
    const metrics = [{ name: "甲级率", value: 95 }];
    const report: DailyReportV14 = buildDailyReport("2026-10-18", metrics);
    expect(report.metrics.length).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-daily-report auth:true", () => {
    const def = (emrQcDailyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-daily-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
