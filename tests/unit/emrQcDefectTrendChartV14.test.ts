/**
 * 健澜科技 jlmedaios - 质控缺陷趋势图 V14 单测（M506-A）
 *
 * 测试 buildTrendChart 构建、aggregateTrendChart 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateTrendChart,
  buildTrendChart,
  type TrendChartV14,
} from "../../src/bff/aggregators/emrQcDefectTrendChartV14Aggregator";
import { emrQcDefectTrendChartV14Routes } from "../../src/bff/routes/emrQcDefectTrendChartV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTrendChart 2026-01", () => {
  // 手算：month='2026-01', count=45 → 正确构建
  it("month='2026-01', count=45 → 正确构建", () => {
    const point: TrendChartV14 = buildTrendChart("2026-01", 45);
    expect(point.month).toBe("2026-01");
    expect(point.count).toBe(45);
  });
});

describe("aggregateTrendChart 三个月", () => {
  // 手算：3 个月数据（45/60/30）
  // total = 45+60+30 = 135
  // avg = 135/3 = 45
  // max = 60, min = 30
  it("3 个月数据（45/60/30）→ total=135, avg=45, max=60, min=30", () => {
    const data: TrendChartV14[] = [
      buildTrendChart("2026-01", 45),
      buildTrendChart("2026-02", 60),
      buildTrendChart("2026-03", 30),
    ];
    const result = aggregateTrendChart(data);
    expect(result.total).toBe(135);
    expect(result.avg).toBe(45);
    expect(result.max).toBe(60);
    expect(result.min).toBe(30);
  });
});

describe("aggregateTrendChart 空数组", () => {
  // 手算：空数组 → total=0, avg=0, max=0, min=0
  it("空数组 → total=0, avg=0, max=0, min=0", () => {
    const data: TrendChartV14[] = [];
    const result = aggregateTrendChart(data);
    expect(result.total).toBe(0);
    expect(result.avg).toBe(0);
    expect(result.max).toBe(0);
    expect(result.min).toBe(0);
  });
});

describe("buildTrendChart 2026-02", () => {
  // 手算：month='2026-02', count=60 → 正确构建
  it("month='2026-02', count=60 → 正确构建", () => {
    const point: TrendChartV14 = buildTrendChart("2026-02", 60);
    expect(point.month).toBe("2026-02");
    expect(point.count).toBe(60);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-defect-trend-chart auth:true", () => {
    const def = (emrQcDefectTrendChartV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-defect-trend-chart");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
