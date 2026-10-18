/**
 * 健澜科技 jlmedaios - 质控综合统计大屏 V14 单测（M500-D，M500 收官里程碑）
 *
 * 测试 buildStatDashboard 构建、aggregateAllStats 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateAllStats,
  buildStatDashboard,
  type StatDashboardV14,
} from "../../src/bff/aggregators/emrQcStatDashboardV14Aggregator";
import { emrQcStatDashboardV14Routes } from "../../src/bff/routes/emrQcStatDashboardV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStatDashboard 基线数据", () => {
  // 手算：defectTotal=28, passRate=91.0, avgHours=28.0 → 正确构建
  it("defectTotal=28, passRate=91.0, avgHours=28.0 → 正确构建", () => {
    const dashboard: StatDashboardV14 = buildStatDashboard(28, 91.0, 28.0);
    expect(dashboard.defectTotal).toBe(28);
    expect(dashboard.passRate).toBeCloseTo(91.0);
    expect(dashboard.avgHours).toBeCloseTo(28.0);
  });
});

describe("aggregateAllStats 正常数据", () => {
  // 手算：defects=28, passCount=273, passTotal=300, hours=28.0 → defectTotal=28, passRate=91（Math.ceil(273/300×100)=91）, avgHours=28.0
  it("defects=28, passCount=273, passTotal=300, hours=28.0 → 正确聚合", () => {
    const result = aggregateAllStats(28, 273, 300, 28.0);
    expect(result.defectTotal).toBe(28);
    expect(result.passRate).toBe(91);
    expect(result.avgHours).toBeCloseTo(28.0);
  });
});

describe("aggregateAllStats 空数据", () => {
  // 手算：空数据 → defectTotal=0, passRate=0, avgHours=0
  it("空数据 → defectTotal=0, passRate=0, avgHours=0", () => {
    const result = aggregateAllStats(0, 0, 0, 0);
    expect(result.defectTotal).toBe(0);
    expect(result.passRate).toBe(0);
    expect(result.avgHours).toBe(0);
  });
});

describe("buildStatDashboard 另一组数据", () => {
  // 手算：defectTotal=50, passRate=85.5, avgHours=36.0 → 正确构建
  it("defectTotal=50, passRate=85.5, avgHours=36.0 → 正确构建", () => {
    const dashboard: StatDashboardV14 = buildStatDashboard(50, 85.5, 36.0);
    expect(dashboard.defectTotal).toBe(50);
    expect(dashboard.passRate).toBeCloseTo(85.5);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-stat-dashboard auth:true", () => {
    const def = (emrQcStatDashboardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-stat-dashboard");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
