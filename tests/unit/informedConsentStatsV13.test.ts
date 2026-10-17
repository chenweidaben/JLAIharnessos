/**
 * 健澜科技 jlmedaios - 知情同意统计 V13 单测（M387-C，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInformedConsentSignRateV13,
  computeSpecialExamConsentRateV13,
  computeSurgeryConsentRateV13,
  type InformedConsentRecordV13,
} from "../../src/bff/aggregators/informedConsentStatsV13Aggregator";
import { informedConsentStatsV13Routes } from "../../src/bff/routes/informedConsentStatsV13";

const records: InformedConsentRecordV13[] = [
  { signedCount: 990, shouldCount: 1000, specialSignedCount: 950, specialShouldCount: 1000, surgerySignedCount: 1000, surgeryShouldCount: 1000 },
  { signedCount: 990, shouldCount: 1000, specialSignedCount: 950, specialShouldCount: 1000, surgerySignedCount: 1000, surgeryShouldCount: 1000 },
];

describe("computeInformedConsentSignRateV13", () => {
  // 算式：(990+990)/(1000+1000) = 1980/2000×100 = 99.00
  it("知情同意书签署率 = 99.00%", () => {
    expect(computeInformedConsentSignRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeInformedConsentSignRateV13([])).toBe(0);
  });
});

describe("computeSpecialExamConsentRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("特殊检查同意率 = 95.00%", () => {
    expect(computeSpecialExamConsentRateV13(records)).toBe(95.00);
  });
});

describe("computeSurgeryConsentRateV13", () => {
  // 算式：(1000+1000)/(1000+1000) = 2000/2000×100 = 100.00
  it("手术同意率 = 100.00%", () => {
    expect(computeSurgeryConsentRateV13(records)).toBe(100.00);
  });
});

describe("informedConsentStatsV13Routes 读路由", () => {
  it("GET /api/v1/informed-consent-stats 路由存在且 auth:true", () => {
    const route = informedConsentStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/informed-consent-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
