/**
 * 健澜科技 jlmedaios - 院感控制（细节）V13 单测（M418-C，detail 避让旧版 handHygieneCompliance/ICUInfectionRate/infectionReportMgmt 等院感系列）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEnvironmentalSurfaceSamplingPassRateV13,
  computeHandHygieneComplianceRateV13,
  computeMedicalWasteDisposalPassRateV13,
  type InfectionControlDetailRecordV13,
} from "../../src/bff/aggregators/infectionControlDetailV13Aggregator";
import { infectionControlDetailV13Routes } from "../../src/bff/routes/infectionControlDetailV13";

const records: InfectionControlDetailRecordV13[] = [
  { compliant: 950, shouldExecuteTotal: 1000, sampleQualified: 980, sampleTotal: 1000, disposalCompliant: 990, disposalTotal: 1000 },
  { compliant: 950, shouldExecuteTotal: 1000, sampleQualified: 980, sampleTotal: 1000, disposalCompliant: 990, disposalTotal: 1000 },
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

describe("computeEnvironmentalSurfaceSamplingPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("环境物表采样合格率 = 98.00%", () => {
    expect(computeEnvironmentalSurfaceSamplingPassRateV13(records)).toBe(98.00);
  });
});

describe("computeMedicalWasteDisposalPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("医疗废物处置合格率 = 99.00%", () => {
    expect(computeMedicalWasteDisposalPassRateV13(records)).toBe(99.00);
  });
});

describe("infectionControlDetailV13Routes 读路由", () => {
  it("GET /api/v1/infection-control-detail 路由存在且 auth:true", () => {
    const route = infectionControlDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infection-control-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
