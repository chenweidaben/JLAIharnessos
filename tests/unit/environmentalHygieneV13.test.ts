/**
 * 健澜科技 jlmedaios - 环境卫生学 V13 单测（M370-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEnvironmentSamplingPassRateV13,
  computeMedicalWasteDisposalComplianceRateV13,
  computeSewageDischargeComplianceRateV13,
  type EnvironmentalHygieneRecordV13,
} from "../../src/bff/aggregators/environmentalHygieneV13Aggregator";
import { environmentalHygieneV13Routes } from "../../src/bff/routes/environmentalHygieneV13";

const records: EnvironmentalHygieneRecordV13[] = [
  { sampleCount: 100, samplePass: 98, wasteDisposalCount: 100, wasteDisposalCompliant: 95, sewageTestCount: 100, sewageDischargeCompliant: 100 },
  { sampleCount: 100, samplePass: 98, wasteDisposalCount: 100, wasteDisposalCompliant: 95, sewageTestCount: 100, sewageDischargeCompliant: 100 },
];

describe("computeEnvironmentSamplingPassRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("环境采样合格率 = 98.00%", () => {
    expect(computeEnvironmentSamplingPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeEnvironmentSamplingPassRateV13([])).toBe(0);
  });
});

describe("computeMedicalWasteDisposalComplianceRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("医疗废物处置合规率 = 95.00%", () => {
    expect(computeMedicalWasteDisposalComplianceRateV13(records)).toBe(95.00);
  });
});

describe("computeSewageDischargeComplianceRateV13", () => {
  // 算式：(100+100)/(100+100) = 200/200×100 = 100.00
  it("污水排放达标率 = 100.00%", () => {
    expect(computeSewageDischargeComplianceRateV13(records)).toBe(100.00);
  });
});

describe("environmentalHygieneV13Routes 读路由", () => {
  it("GET /api/v1/environmental-hygiene 路由存在且 auth:true", () => {
    const route = environmentalHygieneV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/environmental-hygiene",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
