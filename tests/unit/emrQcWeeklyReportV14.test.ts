/**
 * 健澜科技 jlmedaios - 质控周报 V14 单测（M487-B）
 *
 * 测试 buildWeeklyReport 构建、aggregateWeeklyMetrics 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWeeklyReport,
  aggregateWeeklyMetrics,
  type WeeklyReportV14,
} from "../../src/bff/aggregators/emrQcWeeklyReportV14Aggregator";
import { emrQcWeeklyReportV14Routes } from "../../src/bff/routes/emrQcWeeklyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildWeeklyReport 7天", () => {
  // 手算：week='2026-W42', 7 天数据 → 正确构建
  it("week='2026-W42', 7 天数据 → 正确构建", () => {
    const metrics = [
      { day: "周一", value: 90 },
      { day: "周二", value: 92 },
      { day: "周三", value: 88 },
      { day: "周四", value: 95 },
      { day: "周五", value: 91 },
      { day: "周六", value: 89 },
      { day: "周日", value: 93 },
    ];
    const report: WeeklyReportV14 = buildWeeklyReport("2026-W42", metrics);
    expect(report.week).toBe("2026-W42");
    expect(report.metrics.length).toBe(7);
  });
});

describe("aggregateWeeklyMetrics 7天", () => {
  // 手算：7 天值 90/92/88/95/91/89/93 → sum=638, 638/7≈91.14→保留1位=91.1, maxValue=95
  it("7 天值 90/92/88/95/91/89/93 → days=7, avgValue=91.1, maxValue=95", () => {
    const metrics = [
      { day: "周一", value: 90 },
      { day: "周二", value: 92 },
      { day: "周三", value: 88 },
      { day: "周四", value: 95 },
      { day: "周五", value: 91 },
      { day: "周六", value: 89 },
      { day: "周日", value: 93 },
    ];
    const result = aggregateWeeklyMetrics(metrics);
    expect(result.days).toBe(7);
    expect(result.avgValue).toBeCloseTo(91.1);
    expect(result.maxValue).toBe(95);
  });
});

describe("aggregateWeeklyMetrics 空数组", () => {
  // 手算：空数组 → days=0, avgValue=0
  it("空数组 → days=0, avgValue=0", () => {
    const metrics: { day: string; value: number }[] = [];
    const result = aggregateWeeklyMetrics(metrics);
    expect(result.days).toBe(0);
    expect(result.avgValue).toBe(0);
  });
});

describe("buildWeeklyReport 3天", () => {
  // 手算：3 天数据 → 正确构建
  it("3 天数据 → 正确构建", () => {
    const metrics = [
      { day: "周一", value: 90 },
      { day: "周二", value: 92 },
      { day: "周三", value: 88 },
    ];
    const report: WeeklyReportV14 = buildWeeklyReport("2026-W42", metrics);
    expect(report.metrics.length).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-weekly-report auth:true", () => {
    const def = (emrQcWeeklyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-weekly-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
