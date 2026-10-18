/**
 * 健澜科技 jlmedaios - 信息系统可用性管理 V13 单测（M446-A，信息化建设与数据安全管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSystemAvailabilityMajorFaultCountV13,
  computeSystemAvailabilityPlannedDowntimeHoursV13,
  computeSystemAvailabilityRateV13,
  type SystemAvailabilityMgmtRecordV13,
} from "../../src/bff/aggregators/systemAvailabilityMgmtV13Aggregator";
import { systemAvailabilityMgmtV13Routes } from "../../src/bff/routes/systemAvailabilityMgmtV13";

const records: SystemAvailabilityMgmtRecordV13[] = [
  { availableHours: 950, totalHours: 1000, majorFault: true, plannedDowntimeHours: 1.5 },
  { availableHours: 950, totalHours: 1000, majorFault: true, plannedDowntimeHours: 1.5 },
];

describe("computeSystemAvailabilityRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("核心系统可用率 = 95.00%", () => {
    expect(computeSystemAvailabilityRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSystemAvailabilityRateV13([])).toBe(0);
  });
});

describe("computeSystemAvailabilityMajorFaultCountV13", () => {
  // 算式：records.filter(r => r.majorFault).length = 2 次（两条都 majorFault=true）
  it("重大故障次数 = 2 次（records.filter(r => r.majorFault).length）", () => {
    expect(computeSystemAvailabilityMajorFaultCountV13(records)).toBe(2);
  });
});

describe("computeSystemAvailabilityPlannedDowntimeHoursV13", () => {
  // 算式：records.reduce((sum, r) => sum + r.plannedDowntimeHours, 0) = 1.5+1.5 = 3.0，Math.ceil(3.0) = 3 小时
  it("计划内停机时长 = 3 小时（求和后 Math.ceil 整小时）", () => {
    expect(computeSystemAvailabilityPlannedDowntimeHoursV13(records)).toBe(3);
  });
});

describe("systemAvailabilityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/system-availability-mgmt 路由存在且 auth:true", () => {
    const route = systemAvailabilityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/system-availability-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
