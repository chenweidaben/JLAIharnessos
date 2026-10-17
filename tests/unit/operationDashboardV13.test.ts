/**
 * 健澜科技 jlmedaios - 运营看板 V13 单测（M381-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedOccupancyRateV13,
  computeDailyOutpatientCountV13,
  computeSurgeryCountV13,
  type OperationDashboardRecordV13,
} from "../../src/bff/aggregators/operationDashboardV13Aggregator";
import { operationDashboardV13Routes } from "../../src/bff/routes/operationDashboardV13";

const records: OperationDashboardRecordV13[] = [
  { dailyOutpatientCount: 5000, occupiedBedDays: 950, openBedDays: 1000, surgeryCount: 200 },
  { dailyOutpatientCount: 5000, occupiedBedDays: 950, openBedDays: 1000, surgeryCount: 200 },
];

describe("computeDailyOutpatientCountV13", () => {
  // 算式：5000+5000 = 10000
  it("日门急诊人次 = 10000 人次", () => {
    expect(computeDailyOutpatientCountV13(records)).toBe(10000);
  });
  it("空态 → 0", () => {
    expect(computeDailyOutpatientCountV13([])).toBe(0);
  });
});

describe("computeBedOccupancyRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("床位占用率 = 95.00%", () => {
    expect(computeBedOccupancyRateV13(records)).toBe(95.00);
  });
});

describe("computeSurgeryCountV13", () => {
  // 算式：200+200 = 400
  it("手术台次 = 400 台", () => {
    expect(computeSurgeryCountV13(records)).toBe(400);
  });
});

describe("operationDashboardV13Routes 读路由", () => {
  it("GET /api/v1/operation-dashboard 路由存在且 auth:true", () => {
    const route = operationDashboardV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/operation-dashboard",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
