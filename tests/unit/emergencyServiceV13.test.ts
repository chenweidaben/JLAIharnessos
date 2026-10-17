/**
 * 健澜科技 jlmedaios - 急诊服务 V13 单测（M372-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyCountV13,
  computeEmergencyObservationRateV13,
  computeEmergencyRescueSuccessRateV13,
  type EmergencyServiceRecordV13,
} from "../../src/bff/aggregators/emergencyServiceV13Aggregator";
import { emergencyServiceV13Routes } from "../../src/bff/routes/emergencyServiceV13";

const records: EmergencyServiceRecordV13[] = [
  { emergencyCount: 500, observationCount: 50, rescueCount: 100, rescueSuccessCount: 95 },
  { emergencyCount: 500, observationCount: 50, rescueCount: 100, rescueSuccessCount: 95 },
];

describe("computeEmergencyCountV13", () => {
  // 算式：500+500 = 1000
  it("急诊人次 = 1000", () => {
    expect(computeEmergencyCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyCountV13([])).toBe(0);
  });
});

describe("computeEmergencyObservationRateV13", () => {
  // 算式：(50+50)/(500+500) = 100/1000×100 = 10.00
  it("急诊留观率 = 10.00%", () => {
    expect(computeEmergencyObservationRateV13(records)).toBe(10.00);
  });
});

describe("computeEmergencyRescueSuccessRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("急诊抢救成功率 = 95.00%", () => {
    expect(computeEmergencyRescueSuccessRateV13(records)).toBe(95.00);
  });
});

describe("emergencyServiceV13Routes 读路由", () => {
  it("GET /api/v1/emergency-service 路由存在且 auth:true", () => {
    const route = emergencyServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
