/**
 * 健澜科技 jlmedaios - 病历质控指标体系大屏 V14 单测（M468-A）
 *
 * 测试 buildQcDashboard 通过率/缺陷率、computeIndicatorTrend 环比、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQcDashboard,
  computeIndicatorTrend,
} from "../../src/bff/aggregators/emrQcDashboardV14Aggregator";
import { emrQcDashboardV14Routes } from "../../src/bff/routes/emrQcDashboardV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQcDashboard 通过率+缺陷率", () => {
  // 手算：1000 份病历 950 过 → 950/1000×100 = 95%；50 缺陷 → 50/1000×100 = 5%
  it("1000 份病历 950 过 → passRate=95，defectCount=50 → defectRate=5", () => {
    const result = buildQcDashboard({ totalRecords: 1000, passCount: 950, defectCount: 50 });
    expect(result.passRate).toBe(95);
    expect(result.defectRate).toBe(5);
  });
});

describe("buildQcDashboard 通过率另算", () => {
  // 手算：2000 份病历 1900 过 → 1900/2000×100 = 95%
  it("totalRecords=2000, passCount=1900 → passRate=95", () => {
    const result = buildQcDashboard({ totalRecords: 2000, passCount: 1900, defectCount: 100 });
    expect(result.passRate).toBe(95);
  });
});

describe("computeIndicatorTrend 上升", () => {
  // 手算：当前 95，上月 90 → change = 95 - 90 = 5 > 0 → direction='up'
  it("当前 95 上月 90 → change=5，direction='up'", () => {
    const trend = computeIndicatorTrend(95, 90);
    expect(trend.change).toBe(5);
    expect(trend.direction).toBe("up");
  });
});

describe("computeIndicatorTrend 下降", () => {
  // 手算：当前 90，上月 95 → change = 90 - 95 = -5 < 0 → direction='down'
  it("当前 90 上月 95 → change=-5，direction='down'", () => {
    const trend = computeIndicatorTrend(90, 95);
    expect(trend.change).toBe(-5);
    expect(trend.direction).toBe("down");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dashboard auth:true", () => {
    const def = (emrQcDashboardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dashboard");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
