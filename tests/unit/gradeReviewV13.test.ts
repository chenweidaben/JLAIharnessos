/**
 * 健澜科技 jlmedaios - 等级评审 V13 单测（M395-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCoreClauseAchievementRateV13,
  computeGradeAReviewClauseConformanceRateV13,
  computeRectificationTaskCompletionRateV13,
  type GradeReviewRecordV13,
} from "../../src/bff/aggregators/gradeReviewV13Aggregator";
import { gradeReviewV13Routes } from "../../src/bff/routes/gradeReviewV13";

const records: GradeReviewRecordV13[] = [
  { conformingCount: 900, totalCount: 1000, achievedCount: 950, coreTotalCount: 1000, completedCount: 850, rectificationTotalCount: 1000 },
  { conformingCount: 900, totalCount: 1000, achievedCount: 950, coreTotalCount: 1000, completedCount: 850, rectificationTotalCount: 1000 },
];

describe("computeGradeAReviewClauseConformanceRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("三甲评审条款符合率 = 90.00%", () => {
    expect(computeGradeAReviewClauseConformanceRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeGradeAReviewClauseConformanceRateV13([])).toBe(0);
  });
});

describe("computeCoreClauseAchievementRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("核心条款达成率 = 95.00%", () => {
    expect(computeCoreClauseAchievementRateV13(records)).toBe(95.00);
  });
});

describe("computeRectificationTaskCompletionRateV13", () => {
  // 算式：(850+850)/(1000+1000) = 1700/2000×100 = 85.00
  it("整改任务完成率 = 85.00%", () => {
    expect(computeRectificationTaskCompletionRateV13(records)).toBe(85.00);
  });
});

describe("gradeReviewV13Routes 读路由", () => {
  it("GET /api/v1/grade-review 路由存在且 auth:true", () => {
    const route = gradeReviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/grade-review",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
