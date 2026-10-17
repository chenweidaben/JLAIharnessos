/**
 * 健澜科技 jlmedaios - 压疮管理 V13 单测（M394-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePressureUlcerHealingRateV13,
  computePressureUlcerIncidenceRateV13,
  computePressureUlcerRiskAssessmentRateV13,
  type PressureUlcerMgmtRecordV13,
} from "../../src/bff/aggregators/pressureUlcerMgmtV13Aggregator";
import { pressureUlcerMgmtV13Routes } from "../../src/bff/routes/pressureUlcerMgmtV13";

const records: PressureUlcerMgmtRecordV13[] = [
  { occurrenceCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, healedCount: 8, totalCount: 10 },
  { occurrenceCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, healedCount: 8, totalCount: 10 },
];

describe("computePressureUlcerIncidenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×1000 = 10/20000×1000 = 0.50
  it("压疮发生率 = 0.50‰", () => {
    expect(computePressureUlcerIncidenceRateV13(records)).toBe(0.50);
  });
  it("空态 → 0", () => {
    expect(computePressureUlcerIncidenceRateV13([])).toBe(0);
  });
});

describe("computePressureUlcerRiskAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("压疮风险评估率 = 95.00%", () => {
    expect(computePressureUlcerRiskAssessmentRateV13(records)).toBe(95.00);
  });
});

describe("computePressureUlcerHealingRateV13", () => {
  // 算式：(8+8)/(10+10)×100 = 16/20×100 = 80.00
  it("压疮愈合率 = 80.00%", () => {
    expect(computePressureUlcerHealingRateV13(records)).toBe(80.00);
  });
});

describe("pressureUlcerMgmtV13Routes 读路由", () => {
  it("GET /api/v1/pressure-ulcer-mgmt 路由存在且 auth:true", () => {
    const route = pressureUlcerMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pressure-ulcer-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
