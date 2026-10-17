/**
 * 健澜科技 jlmedaios - 知情同意管理（细节）V13 单测（M413-B，detail 避让旧版 informedConsentStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInformedConsentContentCompletenessRateV13,
  computeInformedConsentSignRateV13,
  computeSpecialExaminationConsentRateV13,
  type InformedConsentDetailRecordV13,
} from "../../src/bff/aggregators/informedConsentDetailV13Aggregator";
import { informedConsentDetailV13Routes } from "../../src/bff/routes/informedConsentDetailV13";

const records: InformedConsentDetailRecordV13[] = [
  { signed: 980, shouldTotal: 1000, complete: 950, consentTotal: 1000, specialAgreed: 99, specialTotal: 100 },
  { signed: 980, shouldTotal: 1000, complete: 950, consentTotal: 1000, specialAgreed: 99, specialTotal: 100 },
];

describe("computeInformedConsentSignRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("知情同意书签署率 = 98.00%", () => {
    expect(computeInformedConsentSignRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeInformedConsentSignRateV13([])).toBe(0);
  });
});

describe("computeInformedConsentContentCompletenessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("知情同意内容完整率 = 95.00%", () => {
    expect(computeInformedConsentContentCompletenessRateV13(records)).toBe(95.00);
  });
});

describe("computeSpecialExaminationConsentRateV13", () => {
  // 算式：(99+99)/(100+100)×100 = 198/200×100 = 99.00
  it("特殊检查治疗同意率 = 99.00%", () => {
    expect(computeSpecialExaminationConsentRateV13(records)).toBe(99.00);
  });
});

describe("informedConsentDetailV13Routes 读路由", () => {
  it("GET /api/v1/informed-consent-detail 路由存在且 auth:true", () => {
    const route = informedConsentDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/informed-consent-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
