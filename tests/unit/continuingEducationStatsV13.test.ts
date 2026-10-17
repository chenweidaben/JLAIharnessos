/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 单测（M354-D，M354 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnnualTrainingCountV13,
  computeCreditComplianceRateV13,
  computeThreeBaseExamPassRateV13,
  type ContinuingEducationStatsRecordV13,
} from "../../src/bff/aggregators/continuingEducationStatsV13Aggregator";
import { continuingEducationStatsV13Routes } from "../../src/bff/routes/continuingEducationStatsV13";

const records: ContinuingEducationStatsRecordV13[] = [
  { creditCompliantCount: 90, creditDueCount: 100, annualTrainingCount: 500, threeBasePassCount: 95, threeBaseTookCount: 100 },
  { creditCompliantCount: 90, creditDueCount: 100, annualTrainingCount: 500, threeBasePassCount: 95, threeBaseTookCount: 100 },
];

describe("computeCreditComplianceRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("学分达标率 = 90.00%", () => {
    expect(computeCreditComplianceRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeCreditComplianceRateV13([])).toBe(0);
  });
});

describe("computeAnnualTrainingCountV13", () => {
  // 算式：500+500 = 1000
  it("年度培训人次 = 1000", () => {
    expect(computeAnnualTrainingCountV13(records)).toBe(1000);
  });
});

describe("computeThreeBaseExamPassRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("三基考核合格率 = 95.00%", () => {
    expect(computeThreeBaseExamPassRateV13(records)).toBe(95.00);
  });
});

describe("continuingEducationStatsV13Routes 读路由", () => {
  it("GET /api/v1/continuing-education-stats 路由存在且 auth:true", () => {
    const route = continuingEducationStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/continuing-education-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
