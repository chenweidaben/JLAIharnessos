/**
 * 健澜科技 jlmedaios - 人才发展 V13 单测（M397-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHighLevelTalentCountV13,
  computeTalentTrainingPlanCompletionRateV13,
  computeTitleStructureCompositionV13,
  type TalentDevelopmentRecordV13,
} from "../../src/bff/aggregators/talentDevelopmentV13Aggregator";
import { talentDevelopmentV13Routes } from "../../src/bff/routes/talentDevelopmentV13";

const records: TalentDevelopmentRecordV13[] = [
  { highLevelCount: 5, senior: 2, deputySenior: 8, intermediate: 20, junior: 30, completedCount: 45, plannedCount: 50 },
  { highLevelCount: 5, senior: 2, deputySenior: 8, intermediate: 20, junior: 30, completedCount: 45, plannedCount: 50 },
];

describe("computeHighLevelTalentCountV13", () => {
  // 算式：5+5 = 10
  it("高层次人才数 = 10 人", () => {
    expect(computeHighLevelTalentCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeHighLevelTalentCountV13([])).toBe(0);
  });
});

describe("computeTitleStructureCompositionV13", () => {
  // 算式：senior=2+2=4, deputySenior=8+8=16, intermediate=20+20=40, junior=30+30=60
  it("职称结构构成 = {senior: 4, deputySenior: 16, intermediate: 40, junior: 60}", () => {
    expect(computeTitleStructureCompositionV13(records)).toEqual({ senior: 4, deputySenior: 16, intermediate: 40, junior: 60 });
  });
});

describe("computeTalentTrainingPlanCompletionRateV13", () => {
  // 算式：(45+45)/(50+50) = 90/100×100 = 90.00
  it("人才培养计划完成率 = 90.00%", () => {
    expect(computeTalentTrainingPlanCompletionRateV13(records)).toBe(90.00);
  });
});

describe("talentDevelopmentV13Routes 读路由", () => {
  it("GET /api/v1/talent-development 路由存在且 auth:true", () => {
    const route = talentDevelopmentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/talent-development",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
