/**
 * 健澜科技 jlmedaios - 科研成果转化管理 V13 单测（M456-B，学科建设与科研管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeResearchAchievementTransformHorizontalFundRateV13,
  computeResearchAchievementTransformRateV13,
  computeResearchAchievementTransformRegistrationCountV13,
  type ResearchAchievementTransformMgmtRecordV13,
} from "../../src/bff/aggregators/researchAchievementTransformMgmtV13Aggregator";
import { researchAchievementTransformMgmtV13Routes } from "../../src/bff/routes/researchAchievementTransformMgmtV13";

const records: ResearchAchievementTransformMgmtRecordV13[] = [
  { achievementCount: 950, transformed: 900, totalRegistered: 1000, received: 980, totalContract: 1000 },
  { achievementCount: 950, transformed: 900, totalRegistered: 1000, received: 980, totalContract: 1000 },
];

describe("computeResearchAchievementTransformRegistrationCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("成果登记数量 = 1900 件（reduce 累加）", () => {
    expect(computeResearchAchievementTransformRegistrationCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeResearchAchievementTransformRegistrationCountV13([])).toBe(0);
  });
});

describe("computeResearchAchievementTransformRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("成果转化率 = 90.00%", () => {
    expect(computeResearchAchievementTransformRateV13(records)).toBe(90.00);
  });
});

describe("computeResearchAchievementTransformHorizontalFundRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("横向课题到款率 = 98.00%", () => {
    expect(computeResearchAchievementTransformHorizontalFundRateV13(records)).toBe(98.00);
  });
});

describe("researchAchievementTransformMgmtV13Routes 读路由", () => {
  it("GET /api/v1/research-achievement-transform-mgmt 路由存在且 auth:true", () => {
    const route = researchAchievementTransformMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/research-achievement-transform-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
