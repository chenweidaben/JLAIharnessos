/**
 * 健澜科技 jlmedaios - 知情同意书签署率 V13 单测（M340-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSpecialExamConsentRateV13,
  computeSpecialTreatmentConsentRateV13,
  computeSurgeryConsentRateV13,
  type InformedConsentRecordV13,
} from "../../src/bff/aggregators/informedConsentV13Aggregator";
import { informedConsentV13Routes } from "../../src/bff/routes/informedConsentV13";

const records: InformedConsentRecordV13[] = [
  {
    surgeryRequired: 100,
    surgerySigned: 100,
    specialExamRequired: 50,
    specialExamSigned: 45,
    specialTreatmentRequired: 30,
    specialTreatmentSigned: 27,
  },
];

describe("computeSurgeryConsentRateV13", () => {
  // 算式：100/100×100 = 100.0
  it("手术签署率 = 100.0%", () => {
    expect(computeSurgeryConsentRateV13(records)).toBe(100.0);
  });
});

describe("computeSpecialExamConsentRateV13", () => {
  // 算式：45/50×100 = 90.0
  it("特殊检查签署率 = 90.0%", () => {
    expect(computeSpecialExamConsentRateV13(records)).toBe(90.0);
  });
});

describe("computeSpecialTreatmentConsentRateV13", () => {
  // 算式：27/30×100 = 90.0
  it("特殊治疗签署率 = 90.0%", () => {
    expect(computeSpecialTreatmentConsentRateV13(records)).toBe(90.0);
  });
});

describe("空态", () => {
  it("空态 → 手术签署率 0", () => {
    expect(computeSurgeryConsentRateV13([])).toBe(0);
  });
});

describe("informedConsentV13Routes 读路由", () => {
  it("GET /api/v1/informed-consent 路由存在且 auth:true", () => {
    const route = informedConsentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/informed-consent",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
