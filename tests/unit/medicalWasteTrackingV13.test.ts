/**
 * 健澜科技 jlmedaios - 医废追溯管理 V13 单测（M423-D，M423 收官，换名避让旧版 infectionControlDetailV13（M418））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalWasteDisposalTimelyRateV13,
  computeMedicalWasteManifestComplianceRateV13,
  computeMedicalWasteTraceabilityCompleteRateV13,
  type MedicalWasteTrackingRecordV13,
} from "../../src/bff/aggregators/medicalWasteTrackingV13Aggregator";
import { medicalWasteTrackingV13Routes } from "../../src/bff/routes/medicalWasteTrackingV13";

const records: MedicalWasteTrackingRecordV13[] = [
  { traceComplete: 980, wasteTotal: 1000, manifestCompliant: 990, manifestTotal: 1000, timelyDisposal: 970 },
  { traceComplete: 980, wasteTotal: 1000, manifestCompliant: 990, manifestTotal: 1000, timelyDisposal: 970 },
];

describe("computeMedicalWasteTraceabilityCompleteRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("医废溯源完整率 = 98.00%", () => {
    expect(computeMedicalWasteTraceabilityCompleteRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalWasteTraceabilityCompleteRateV13([])).toBe(0);
  });
});

describe("computeMedicalWasteManifestComplianceRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("医废联单合规率 = 99.00%", () => {
    expect(computeMedicalWasteManifestComplianceRateV13(records)).toBe(99.00);
  });
});

describe("computeMedicalWasteDisposalTimelyRateV13", () => {
  // 算式：(970+970)/(1000+1000)×100 = 1940/2000×100 = 97.00
  it("医废处置及时率 = 97.00%", () => {
    expect(computeMedicalWasteDisposalTimelyRateV13(records)).toBe(97.00);
  });
});

describe("medicalWasteTrackingV13Routes 读路由", () => {
  it("GET /api/v1/medical-waste-tracking 路由存在且 auth:true", () => {
    const route = medicalWasteTrackingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-waste-tracking",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
