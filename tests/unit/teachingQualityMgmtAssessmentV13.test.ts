/**
 * 健澜科技 jlmedaios - 教学质量评估 V13 单测（M443-D，M443 收官，教学科研与继续教育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTeachingQualityAccidentRateV13,
  computeTeachingQualityClinicalSatisfactionRateV13,
  computeTeachingQualityRoundQualifiedRateV13,
  type TeachingQualityMgmtAssessmentRecordV13,
} from "../../src/bff/aggregators/teachingQualityMgmtAssessmentV13Aggregator";
import { teachingQualityMgmtAssessmentV13Routes } from "../../src/bff/routes/teachingQualityMgmtAssessmentV13";

const records: TeachingQualityMgmtAssessmentRecordV13[] = [
  { qualifiedRound: 950, totalRound: 1000, satisfiedStudent: 900, surveyedStudent: 1000, teachingAccident: 5, totalTeachingActivity: 1000 },
  { qualifiedRound: 950, totalRound: 1000, satisfiedStudent: 900, surveyedStudent: 1000, teachingAccident: 5, totalTeachingActivity: 1000 },
];

describe("computeTeachingQualityRoundQualifiedRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("教学查房合格率 = 95.00%", () => {
    expect(computeTeachingQualityRoundQualifiedRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeTeachingQualityRoundQualifiedRateV13([])).toBe(0);
  });
});

describe("computeTeachingQualityClinicalSatisfactionRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("临床带教满意度 = 90.00%", () => {
    expect(computeTeachingQualityClinicalSatisfactionRateV13(records)).toBe(90.00);
  });
});

describe("computeTeachingQualityAccidentRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50%（反向，越低越好）
  it("教学事故发生率 = 0.50%（反向，越低越好）", () => {
    expect(computeTeachingQualityAccidentRateV13(records)).toBe(0.50);
  });
});

describe("teachingQualityMgmtAssessmentV13Routes 读路由", () => {
  it("GET /api/v1/teaching-quality-mgmt-assessment 路由存在且 auth:true", () => {
    const route = teachingQualityMgmtAssessmentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/teaching-quality-mgmt-assessment",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
