/**
 * 健澜科技 jlmedaios - 跌倒管理 V13 单测（M422-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFallInjuryGradeRateV13,
  computeFallOccurrenceRateV13,
  computeFallRiskAssessmentRateV13,
  type FallMgmtRecordV13,
} from "../../src/bff/aggregators/fallMgmtV13Aggregator";
import { fallMgmtV13Routes } from "../../src/bff/routes/fallMgmtV13";

const records: FallMgmtRecordV13[] = [
  { assessed: 950, shouldAssess: 1000, occurredPatients: 5, inpatientTotal: 10000, gradedCompliant: 95, fallTotal: 100 },
  { assessed: 950, shouldAssess: 1000, occurredPatients: 5, inpatientTotal: 10000, gradedCompliant: 95, fallTotal: 100 },
];

describe("computeFallRiskAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("跌倒风险评估率 = 95.00%", () => {
    expect(computeFallRiskAssessmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeFallRiskAssessmentRateV13([])).toBe(0);
  });
});

describe("computeFallOccurrenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×100 = 10/20000×100 = 0.05（反向指标，越低越好）
  it("跌倒发生率 = 0.05%（反向指标）", () => {
    expect(computeFallOccurrenceRateV13(records)).toBe(0.05);
  });
});

describe("computeFallInjuryGradeRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("跌倒伤害分级率 = 95.00%", () => {
    expect(computeFallInjuryGradeRateV13(records)).toBe(95.00);
  });
});

describe("fallMgmtV13Routes 读路由", () => {
  it("GET /api/v1/fall-mgmt 路由存在且 auth:true", () => {
    const route = fallMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fall-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
