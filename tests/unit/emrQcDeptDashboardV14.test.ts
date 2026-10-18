/**
 * 健澜科技 jlmedaios - 质控科室看板 V14 单测（M493-A）
 *
 * 测试 buildDeptDashboard 构建、aggregateDeptMetrics 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptDashboard,
  aggregateDeptMetrics,
  type DeptDashboardV14,
  type DeptMetricV14,
} from "../../src/bff/aggregators/emrQcDeptDashboardV14Aggregator";
import { emrQcDeptDashboardV14Routes } from "../../src/bff/routes/emrQcDeptDashboardV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptDashboard 内科3指标", () => {
  // 手算：dept='内科', 3 个指标 → 正确构建
  it("dept='内科', 3 个指标 → 正确构建", () => {
    const metrics: DeptMetricV14[] = [
      { name: "甲级病历率", value: 95 },
      { name: "病历合格率", value: 85 },
      { name: "缺陷整改率", value: 90 },
    ];
    const dashboard: DeptDashboardV14 = buildDeptDashboard("内科", metrics);
    expect(dashboard.dept).toBe("内科");
    expect(dashboard.metrics.length).toBe(3);
  });
});

describe("aggregateDeptMetrics 3指标", () => {
  // 手算：3 个指标值 95/85/90 → count=3, avgValue=90.0（(95+85+90)/3=270/3=90）
  it("3 个指标值 95/85/90 → count=3, avgValue=90.0", () => {
    const metrics: DeptMetricV14[] = [
      { name: "甲级病历率", value: 95 },
      { name: "病历合格率", value: 85 },
      { name: "缺陷整改率", value: 90 },
    ];
    const result = aggregateDeptMetrics(metrics);
    expect(result.count).toBe(3);
    expect(result.avgValue).toBeCloseTo(90.0);
  });
});

describe("aggregateDeptMetrics 空数组", () => {
  // 手算：空数组 → count=0, avgValue=0
  it("空数组 → count=0, avgValue=0", () => {
    const metrics: DeptMetricV14[] = [];
    const result = aggregateDeptMetrics(metrics);
    expect(result.count).toBe(0);
    expect(result.avgValue).toBe(0);
  });
});

describe("buildDeptDashboard 外科1指标", () => {
  // 手算：dept='外科', 1 个指标 → 正确构建
  it("dept='外科', 1 个指标 → 正确构建", () => {
    const metrics: DeptMetricV14[] = [
      { name: "甲级病历率", value: 88 },
    ];
    const dashboard: DeptDashboardV14 = buildDeptDashboard("外科", metrics);
    expect(dashboard.dept).toBe("外科");
    expect(dashboard.metrics.length).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-dashboard auth:true", () => {
    const def = (emrQcDeptDashboardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-dashboard");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
