/**
 * 健澜科技 jlmedaios - 急诊分级 V13 单测（M390-D，M390 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyObservationCountV13,
  computeEmergencyVisitCountV13,
  computeRescueSuccessRateV13,
  type EmergencySeverityRecordV13,
} from "../../src/bff/aggregators/emergencySeverityV13Aggregator";
import { emergencySeverityV13Routes } from "../../src/bff/routes/emergencySeverityV13";

const records: EmergencySeverityRecordV13[] = [
  { visitCount: 1000, successCount: 950, rescueTotalCount: 1000, observationCount: 100 },
  { visitCount: 1000, successCount: 950, rescueTotalCount: 1000, observationCount: 100 },
];

describe("computeEmergencyVisitCountV13", () => {
  // 算式：1000+1000 = 2000
  it("急诊就诊总数 = 2000 人次", () => {
    expect(computeEmergencyVisitCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyVisitCountV13([])).toBe(0);
  });
});

describe("computeRescueSuccessRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("抢救成功率 = 95.00%", () => {
    expect(computeRescueSuccessRateV13(records)).toBe(95.00);
  });
});

describe("computeEmergencyObservationCountV13", () => {
  // 算式：100+100 = 200
  it("急诊留观人数 = 200 人", () => {
    expect(computeEmergencyObservationCountV13(records)).toBe(200);
  });
});

describe("emergencySeverityV13Routes 读路由", () => {
  it("GET /api/v1/emergency-severity 路由存在且 auth:true", () => {
    const route = emergencySeverityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-severity",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
