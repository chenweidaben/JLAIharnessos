/**
 * 健澜科技 jlmedaios - 消防安全 V13 单测（M352-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrillCountV13,
  computeHazardRectificationRateV13,
  computeMonthlyInspectionCountV13,
  type FireSafetyRecordV13,
} from "../../src/bff/aggregators/fireSafetyV13Aggregator";
import { fireSafetyV13Routes } from "../../src/bff/routes/fireSafetyV13";

const records: FireSafetyRecordV13[] = [
  { monthlyInspectionCount: 10, hazardFoundCount: 10, hazardRectifiedCount: 9, drillCount: 2 },
  { monthlyInspectionCount: 10, hazardFoundCount: 10, hazardRectifiedCount: 9, drillCount: 2 },
];

describe("computeMonthlyInspectionCountV13", () => {
  // 算式：10+10 = 20
  it("月度消防检查次数 = 20", () => {
    expect(computeMonthlyInspectionCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeMonthlyInspectionCountV13([])).toBe(0);
  });
});

describe("computeHazardRectificationRateV13", () => {
  // 算式：(9+9)/(10+10) = 18/20×100 = 90.00
  it("隐患整改率 = 90.00%", () => {
    expect(computeHazardRectificationRateV13(records)).toBe(90.00);
  });
});

describe("computeDrillCountV13", () => {
  // 算式：2+2 = 4
  it("应急演练次数 = 4", () => {
    expect(computeDrillCountV13(records)).toBe(4);
  });
});

describe("fireSafetyV13Routes 读路由", () => {
  it("GET /api/v1/fire-safety 路由存在且 auth:true", () => {
    const route = fireSafetyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fire-safety",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
