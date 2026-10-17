/**
 * 健澜科技 jlmedaios - 知情同意管理 V13 单测（M425-C，换名避让旧版 consentDetailV13（M413））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInformedConsentFormPassRateV13,
  computeInformedConsentSignRateV13,
  computeSpecialTreatmentConsentRateV13,
  type ConsentMgmtRecordV13,
} from "../../src/bff/aggregators/consentMgmtV13Aggregator";
import { consentMgmtV13Routes } from "../../src/bff/routes/consentMgmtV13";

const records: ConsentMgmtRecordV13[] = [
  { signed: 990, shouldSign: 1000, formPass: 980, signedTotal: 1000, specialSigned: 950, specialCase: 1000 },
  { signed: 990, shouldSign: 1000, formPass: 980, signedTotal: 1000, specialSigned: 950, specialCase: 1000 },
];

describe("computeInformedConsentSignRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("知情同意签署率 = 99.00%", () => {
    expect(computeInformedConsentSignRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeInformedConsentSignRateV13([])).toBe(0);
  });
});

describe("computeInformedConsentFormPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("知情同意书合格率 = 98.00%", () => {
    expect(computeInformedConsentFormPassRateV13(records)).toBe(98.00);
  });
});

describe("computeSpecialTreatmentConsentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("特殊治疗同意率 = 95.00%", () => {
    expect(computeSpecialTreatmentConsentRateV13(records)).toBe(95.00);
  });
});

describe("consentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/consent-mgmt 路由存在且 auth:true", () => {
    const route = consentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/consent-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
