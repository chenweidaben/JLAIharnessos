/**
 * 健澜科技 jlmedaios - 核心制度落实 V13 单测（M387-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDifficultCaseDiscussionRateV13,
  computeFirstVisitResponsibilityRateV13,
  computeThreeLevelRoundRateV13,
  type CoreSystemComplianceRecordV13,
} from "../../src/bff/aggregators/coreSystemComplianceV13Aggregator";
import { coreSystemComplianceV13Routes } from "../../src/bff/routes/coreSystemComplianceV13";

const records: CoreSystemComplianceRecordV13[] = [
  { firstVisitImplemented: 980, firstVisitShould: 1000, roundImplemented: 950, roundShould: 1000, discussed: 900, shouldDiscuss: 1000 },
  { firstVisitImplemented: 980, firstVisitShould: 1000, roundImplemented: 950, roundShould: 1000, discussed: 900, shouldDiscuss: 1000 },
];

describe("computeFirstVisitResponsibilityRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("首诊负责落实率 = 98.00%", () => {
    expect(computeFirstVisitResponsibilityRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeFirstVisitResponsibilityRateV13([])).toBe(0);
  });
});

describe("computeThreeLevelRoundRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("三级查房落实率 = 95.00%", () => {
    expect(computeThreeLevelRoundRateV13(records)).toBe(95.00);
  });
});

describe("computeDifficultCaseDiscussionRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("疑难病例讨论率 = 90.00%", () => {
    expect(computeDifficultCaseDiscussionRateV13(records)).toBe(90.00);
  });
});

describe("coreSystemComplianceV13Routes 读路由", () => {
  it("GET /api/v1/core-system-compliance 路由存在且 auth:true", () => {
    const route = coreSystemComplianceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/core-system-compliance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
