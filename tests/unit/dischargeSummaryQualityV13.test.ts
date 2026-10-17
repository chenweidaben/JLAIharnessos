/**
 * 健澜科技 jlmedaios - 出院小结质量评分 V13 单测（M314-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSummaryQualityScoreV13,
  gradeSummaryQualityV13,
  identifySummaryDeficiencyV13,
  type DischargeSummaryV13,
} from "../../src/bff/aggregators/dischargeSummaryQualityV13Aggregator";
import { dischargeSummaryQualityV13Routes } from "../../src/bff/routes/dischargeSummaryQualityV13";

const summary: DischargeSummaryV13 = {
  completeness: 90,
  wordCount: 80,
  icdCompleteness: 85,
  medConsistency: 90,
};

describe("computeSummaryQualityScoreV13", () => {
  // 算式：必填 90×0.3=27 + 字数 80×0.2=16 + ICD 85×0.3=25.5 + 用药 90×0.2=18
  // total = 27+16+25.5+18 = 86.5
  it("score = 86.5", () => {
    expect(computeSummaryQualityScoreV13(summary)).toBe(86.5);
  });
});

describe("gradeSummaryQualityV13", () => {
  // 算式：86.5 ≥ 85 → 优
  it("86.5 → 优", () => {
    expect(gradeSummaryQualityV13(86.5)).toBe("优");
  });
  // 算式：75 在 70-85 → 良
  it("75 → 良", () => {
    expect(gradeSummaryQualityV13(75)).toBe("良");
  });
  // 算式：60 < 70 → 待改进
  it("60 → 待改进", () => {
    expect(gradeSummaryQualityV13(60)).toBe("待改进");
  });
});

describe("identifySummaryDeficiencyV13", () => {
  // 算式：四维分 90/80/85/90，最低 = 80（字数）
  it("缺陷 = [字数]", () => {
    expect(identifySummaryDeficiencyV13(86.5, summary)).toEqual(["字数"]);
  });
});

describe("dischargeSummaryQualityV13Routes 读路由", () => {
  it("GET /api/v1/discharge-summary-quality 路由存在且 auth:true", () => {
    const route = dischargeSummaryQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discharge-summary-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
