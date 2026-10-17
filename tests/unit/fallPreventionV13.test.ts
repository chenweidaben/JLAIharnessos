/**
 * 健澜科技 jlmedaios - 跌倒预防 V13 单测（M394-A，新规格）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFallInjuryGradeCompositionV13,
  computeFallIncidenceRateV13,
  computeFallRiskAssessmentRateV13,
  type FallPreventionRecordV13,
} from "../../src/bff/aggregators/fallPreventionV13Aggregator";
import { fallPreventionV13Routes } from "../../src/bff/routes/fallPreventionV13";

const records: FallPreventionRecordV13[] = [
  { fallCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, noneCount: 3, minorCount: 1, majorCount: 1, deathCount: 0 },
  { fallCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, noneCount: 3, minorCount: 1, majorCount: 1, deathCount: 0 },
];

describe("computeFallIncidenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×1000 = 10/20000×1000 = 0.50
  it("跌倒发生率 = 0.50‰", () => {
    expect(computeFallIncidenceRateV13(records)).toBe(0.50);
  });
  it("空态 → 0", () => {
    expect(computeFallIncidenceRateV13([])).toBe(0);
  });
});

describe("computeFallRiskAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("跌倒风险评估率 = 95.00%", () => {
    expect(computeFallRiskAssessmentRateV13(records)).toBe(95.00);
  });
});

describe("computeFallInjuryGradeCompositionV13", () => {
  // 算式：none=3+3=6, minor=1+1=2, major=1+1=2, death=0+0=0
  it("跌倒伤害分级构成 = {none: 6, minor: 2, major: 2, death: 0}", () => {
    expect(computeFallInjuryGradeCompositionV13(records)).toEqual({ none: 6, minor: 2, major: 2, death: 0 });
  });
});

describe("fallPreventionV13Routes 读路由", () => {
  it("GET /api/v1/fall-prevention 路由存在且 auth:true", () => {
    const route = fallPreventionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fall-prevention",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
