/**
 * 健澜科技 jlmedaios - DRG 绩效 V13 单测（M356-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCmiValueV13,
  computeCostConsumptionIndexV13,
  computeDrgCoveredGroupsV13,
  computeTimeConsumptionIndexV13,
  type DrgPerformanceRecordV13,
} from "../../src/bff/aggregators/drgPerformanceV13Aggregator";
import { drgPerformanceV13Routes } from "../../src/bff/routes/drgPerformanceV13";

const records: DrgPerformanceRecordV13[] = [
  { coveredGroups: 200, cmi: 1.2, timeConsumptionIndex: 0.9, costConsumptionIndex: 0.8 },
  { coveredGroups: 300, cmi: 1.4, timeConsumptionIndex: 1.1, costConsumptionIndex: 1.2 },
];

describe("computeDrgCoveredGroupsV13", () => {
  // 算式：200+300 = 500
  it("DRG 覆盖组数 = 500 组", () => {
    expect(computeDrgCoveredGroupsV13(records)).toBe(500);
  });
});

describe("computeCmiValueV13", () => {
  // 算式：(1.2+1.4)/2 = 2.6/2 = 1.300
  it("CMI 值 = 1.300", () => {
    expect(computeCmiValueV13(records)).toBe(1.300);
  });
  it("空态 → 0", () => {
    expect(computeCmiValueV13([])).toBe(0);
  });
});

describe("computeTimeConsumptionIndexV13", () => {
  // 算式：(0.9+1.1)/2 = 2.0/2 = 1.000
  it("时间消耗指数 = 1.000", () => {
    expect(computeTimeConsumptionIndexV13(records)).toBe(1.000);
  });
});

describe("computeCostConsumptionIndexV13", () => {
  // 算式：(0.8+1.2)/2 = 2.0/2 = 1.000
  it("费用消耗指数 = 1.000", () => {
    expect(computeCostConsumptionIndexV13(records)).toBe(1.000);
  });
});

describe("drgPerformanceV13Routes 读路由", () => {
  it("GET /api/v1/drg-performance 路由存在且 auth:true", () => {
    const route = drgPerformanceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drg-performance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
