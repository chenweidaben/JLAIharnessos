/**
 * 健澜科技 jlmedaios - 医废追溯质量管理 V13 单测（M436-D，M436 收官，-quality 后缀避让旧版 medicalWasteTraceabilityMgmtV13（M423））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalWasteClassificationAccuracyRateV13,
  computeMedicalWasteDisposalTimelinessRateV13,
  computeMedicalWasteHandoverCompletenessRateV13,
  type MedicalWasteTraceabilityQualityMgmtRecordV13,
} from "../../src/bff/aggregators/medicalWasteTraceabilityQualityMgmtV13Aggregator";
import { medicalWasteTraceabilityQualityMgmtV13Routes } from "../../src/bff/routes/medicalWasteTraceabilityQualityMgmtV13";

const records: MedicalWasteTraceabilityQualityMgmtRecordV13[] = [
  { accurateClassified: 980, totalWaste: 1000, completeHandover: 950, totalHandover: 1000, timelyDisposal: 900, shouldDisposal: 1000 },
  { accurateClassified: 980, totalWaste: 1000, completeHandover: 950, totalHandover: 1000, timelyDisposal: 900, shouldDisposal: 1000 },
];

describe("computeMedicalWasteClassificationAccuracyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("医废分类准确率 = 98.00%", () => {
    expect(computeMedicalWasteClassificationAccuracyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalWasteClassificationAccuracyRateV13([])).toBe(0);
  });
});

describe("computeMedicalWasteHandoverCompletenessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("医废交接完整率 = 95.00%", () => {
    expect(computeMedicalWasteHandoverCompletenessRateV13(records)).toBe(95.00);
  });
});

describe("computeMedicalWasteDisposalTimelinessRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("医废处置及时率 = 90.00%", () => {
    expect(computeMedicalWasteDisposalTimelinessRateV13(records)).toBe(90.00);
  });
});

describe("medicalWasteTraceabilityQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-waste-traceability-quality-mgmt 路由存在且 auth:true", () => {
    const route = medicalWasteTraceabilityQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-waste-traceability-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
