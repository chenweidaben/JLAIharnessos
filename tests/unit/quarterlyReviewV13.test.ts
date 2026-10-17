/**
 * 健澜科技 jlmedaios - 院长季度复盘报告 V13 单测（M310-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQuarterlyReviewV13,
  computeKpiAchievementRateV13,
  generateNextQuarterSuggestionsV13,
  type QuarterlyKpiV13,
} from "../../src/bff/aggregators/quarterlyReviewV13Aggregator";
import { quarterlyReviewV13Routes } from "../../src/bff/routes/quarterlyReviewV13";

const kpis: QuarterlyKpiV13[] = [
  { name: "a", actual: 80, target: 100 },
  { name: "b", actual: 90, target: 100 },
];

describe("computeKpiAchievementRateV13", () => {
  // 算式：rate1 = 80/100×100 = 80；rate2 = 90/100×100 = 90
  // avg = (80 + 90) / 2 = 85
  it("avg = 85", () => {
    expect(computeKpiAchievementRateV13(kpis)).toBe(85);
  });
  it("空态 → 0", () => {
    expect(computeKpiAchievementRateV13([])).toBe(0);
  });
});

describe("buildQuarterlyReviewV13", () => {
  it("返回 quarter + kpiAchievementRate + 亮点/短板", () => {
    const r = buildQuarterlyReviewV13("2026-Q3", kpis, ["hl1"], ["gap1"]);
    expect(r.quarter).toBe("2026-Q3");
    expect(r.kpiAchievementRate).toBe(85);
    expect(r.highlights).toEqual(["hl1"]);
    expect(r.gaps).toEqual(["gap1"]);
  });
});

describe("generateNextQuarterSuggestionsV13", () => {
  it("按短板映射动作", () => {
    const r = buildQuarterlyReviewV13("2026-Q3", kpis, [], ["闭环率不足"]);
    expect(generateNextQuarterSuggestionsV13(r)).toEqual(["下季度重点改进：闭环率不足"]);
  });
  it("空短板 → []", () => {
    const r = buildQuarterlyReviewV13("2026-Q3", kpis, [], []);
    expect(generateNextQuarterSuggestionsV13(r).length).toBe(0);
  });
});

describe("quarterlyReviewV13Routes 读路由", () => {
  it("GET /api/v1/quarterly-review 路由存在且 auth:true", () => {
    const route = quarterlyReviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/quarterly-review",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
