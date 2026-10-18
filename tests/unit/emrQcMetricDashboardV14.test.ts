/**
 * 健澜科技 jlmedaios - 质控指标看板 V14 单测（M484-A）
 *
 * 测试 buildDashboard 构建、aggregateDashboardMetrics 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDashboard,
  aggregateDashboardMetrics,
  type DashboardV14,
} from "../../src/bff/aggregators/emrQcMetricDashboardV14Aggregator";
import { emrQcMetricDashboardV14Routes } from "../../src/bff/routes/emrQcMetricDashboardV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDashboard 构建", () => {
  // 手算：title='质控指标看板', 3 个指标 → 正确构建
  it("title=质控指标看板, 3 个指标 → 正确构建", () => {
    const metrics = [
      { name: "完整率", value: 95 },
      { name: "及时率", value: 85 },
      { name: "规范率", value: 90 },
    ];
    const dashboard: DashboardV14 = buildDashboard("质控指标看板", metrics);
    expect(dashboard.title).toBe("质控指标看板");
    expect(dashboard.metrics.length).toBe(3);
  });
});

describe("aggregateDashboardMetrics 聚合", () => {
  // 手算：3 个指标值 95/85/90 → (95+85+90)/3=90.0
  it("3 个指标值 95/85/90 → count=3, avgValue=90.0", () => {
    const metrics = [
      { name: "完整率", value: 95 },
      { name: "及时率", value: 85 },
      { name: "规范率", value: 90 },
    ];
    const result = aggregateDashboardMetrics(metrics);
    expect(result.count).toBe(3);
    expect(result.avgValue).toBeCloseTo(90.0);
  });
});

describe("aggregateDashboardMetrics 空数组", () => {
  // 手算：空数组 → count=0, avgValue=0
  it("空数组 → count=0, avgValue=0", () => {
    const metrics: { name: string; value: number }[] = [];
    const result = aggregateDashboardMetrics(metrics);
    expect(result.count).toBe(0);
    expect(result.avgValue).toBe(0);
  });
});

describe("buildDashboard 1个指标", () => {
  // 手算：1 个指标 → 正确构建
  it("1 个指标 → 正确构建", () => {
    const metrics = [{ name: "完整率", value: 95 }];
    const dashboard: DashboardV14 = buildDashboard("质控指标看板", metrics);
    expect(dashboard.metrics.length).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-metric-dashboard auth:true", () => {
    const def = (emrQcMetricDashboardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-metric-dashboard");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
