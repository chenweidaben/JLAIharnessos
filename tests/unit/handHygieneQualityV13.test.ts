/**
 * 健澜科技 jlmedaios - 手卫生质量管理 V13 单测（M441-B，医院感染管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHandHygieneComplianceRateV13,
  computeHandHygieneFacilityIntegrityRateV13,
  computeHandHygieneQualifiedRateV13,
  type HandHygieneQualityRecordV13,
} from "../../src/bff/aggregators/handHygieneQualityV13Aggregator";
import { handHygieneQualityV13Routes } from "../../src/bff/routes/handHygieneQualityV13";

const records: HandHygieneQualityRecordV13[] = [
  { actualPerformed: 950, shouldPerform: 1000, qualifiedHandHygiene: 900, sampledHandHygiene: 1000, intactFacility: 980, totalFacility: 1000 },
  { actualPerformed: 950, shouldPerform: 1000, qualifiedHandHygiene: 900, sampledHandHygiene: 1000, intactFacility: 980, totalFacility: 1000 },
];

describe("computeHandHygieneComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("手卫生依从率 = 95.00%", () => {
    expect(computeHandHygieneComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHandHygieneComplianceRateV13([])).toBe(0);
  });
});

describe("computeHandHygieneQualifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("手卫生合格率 = 90.00%", () => {
    expect(computeHandHygieneQualifiedRateV13(records)).toBe(90.00);
  });
});

describe("computeHandHygieneFacilityIntegrityRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("手卫生设施完好率 = 98.00%", () => {
    expect(computeHandHygieneFacilityIntegrityRateV13(records)).toBe(98.00);
  });
});

describe("handHygieneQualityV13Routes 读路由", () => {
  it("GET /api/v1/hand-hygiene-quality 路由存在且 auth:true", () => {
    const route = handHygieneQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hand-hygiene-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
