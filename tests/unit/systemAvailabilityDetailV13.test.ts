/**
 * 健澜科技 jlmedaios - 系统可用性明细 V13 单测（M379-C，detail 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCoreSystemAvailabilityRateV13,
  computePlannedDowntimeHoursV13,
  computeUnplannedDowntimeCountV13,
  type SystemAvailabilityRecordV13,
} from "../../src/bff/aggregators/systemAvailabilityDetailV13Aggregator";
import { systemAvailabilityDetailV13Routes } from "../../src/bff/routes/systemAvailabilityDetailV13";

const records: SystemAvailabilityRecordV13[] = [
  { availableHours: 8700, totalAnnualHours: 8760, plannedDowntimeHours: 10, unplannedDowntimeCount: 2 },
  { availableHours: 8700, totalAnnualHours: 8760, plannedDowntimeHours: 10, unplannedDowntimeCount: 2 },
];

describe("computeCoreSystemAvailabilityRateV13", () => {
  // 算式：(8700+8700)/(8760+8760) = 17400/17520×100 = 99.32
  it("核心系统年可用率 = 99.32%", () => {
    expect(computeCoreSystemAvailabilityRateV13(records)).toBe(99.32);
  });
  it("空态 → 0", () => {
    expect(computeCoreSystemAvailabilityRateV13([])).toBe(0);
  });
});

describe("computePlannedDowntimeHoursV13", () => {
  // 算式：10+10 = 20
  it("计划停机时长 = 20 小时", () => {
    expect(computePlannedDowntimeHoursV13(records)).toBe(20);
  });
});

describe("computeUnplannedDowntimeCountV13", () => {
  // 算式：2+2 = 4
  it("故障停机次数 = 4 次", () => {
    expect(computeUnplannedDowntimeCountV13(records)).toBe(4);
  });
});

describe("systemAvailabilityDetailV13Routes 读路由", () => {
  it("GET /api/v1/system-availability-detail 路由存在且 auth:true", () => {
    const route = systemAvailabilityDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/system-availability-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
