/**
 * 健澜科技 jlmedaios - 院感监测 V13 单测（M370-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIcuCatheterRelatedInfectionRateV13,
  computeMdroDetectionRateV13,
  computeSurgicalSiteInfectionRateV13,
  type InfectionSurveillanceRecordV13,
} from "../../src/bff/aggregators/infectionSurveillanceV13Aggregator";
import { infectionSurveillanceV13Routes } from "../../src/bff/routes/infectionSurveillanceV13";

const records: InfectionSurveillanceRecordV13[] = [
  { mdroTested: 200, mdroDetected: 20, surgeryCount: 100, ssiCount: 1, catheterDays: 1000, catheterInfectionCount: 2 },
  { mdroTested: 200, mdroDetected: 20, surgeryCount: 100, ssiCount: 1, catheterDays: 1000, catheterInfectionCount: 2 },
];

describe("computeMdroDetectionRateV13", () => {
  // 算式：(20+20)/(200+200) = 40/400×100 = 10.00
  it("多重耐药菌检出率 = 10.00%", () => {
    expect(computeMdroDetectionRateV13(records)).toBe(10.00);
  });
  it("空态 → 0", () => {
    expect(computeMdroDetectionRateV13([])).toBe(0);
  });
});

describe("computeSurgicalSiteInfectionRateV13", () => {
  // 算式：(1+1)/(100+100) = 2/200×100 = 1.00
  it("手术部位感染率 = 1.00%", () => {
    expect(computeSurgicalSiteInfectionRateV13(records)).toBe(1.00);
  });
});

describe("computeIcuCatheterRelatedInfectionRateV13", () => {
  // 算式：(2+2)/(1000+1000) = 4/2000×100 = 0.20
  it("ICU 导管相关感染率 = 0.20%", () => {
    expect(computeIcuCatheterRelatedInfectionRateV13(records)).toBe(0.20);
  });
});

describe("infectionSurveillanceV13Routes 读路由", () => {
  it("GET /api/v1/infection-surveillance 路由存在且 auth:true", () => {
    const route = infectionSurveillanceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infection-surveillance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
