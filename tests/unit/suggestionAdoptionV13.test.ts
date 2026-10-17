/**
 * 健澜科技 jlmedaios - 改进建议采纳率追踪 V13 单测（M309-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compareByDeptQuarterV13,
  computeSuggestionAdoptionRateV13,
  trackSuggestionAdoptionV13,
  type SuggestionItemV13,
} from "../../src/bff/aggregators/suggestionAdoptionV13Aggregator";
import { suggestionAdoptionV13Routes } from "../../src/bff/routes/suggestionAdoptionV13";

const suggestions: SuggestionItemV13[] = [
  { suggestionId: "s1", title: "a", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s2", title: "b", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s3", title: "c", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s4", title: "d", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s5", title: "e", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s6", title: "f", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s7", title: "g", dept: "cardio", quarter: "Q3", status: "rejected" },
  { suggestionId: "s8", title: "h", dept: "cardio", quarter: "Q3", status: "rejected" },
  { suggestionId: "s9", title: "i", dept: "cardio", quarter: "Q3", status: "implemented" },
  { suggestionId: "s10", title: "j", dept: "cardio", quarter: "Q3", status: "implemented" },
];

describe("trackSuggestionAdoptionV13", () => {
  // 算式：10 条，adopted=6, rejected=2, implemented=2, total=10
  it("计数 adopted=6/rejected=2/implemented=2/total=10", () => {
    const s = trackSuggestionAdoptionV13(suggestions);
    expect(s.adopted).toBe(6);
    expect(s.rejected).toBe(2);
    expect(s.implemented).toBe(2);
    expect(s.total).toBe(10);
  });
});

describe("computeSuggestionAdoptionRateV13", () => {
  // 算式：6/10×100 = 60
  it("采纳率 = 60", () => {
    expect(computeSuggestionAdoptionRateV13(suggestions)).toBe(60);
  });
  it("空态 → 0", () => {
    expect(computeSuggestionAdoptionRateV13([])).toBe(0);
  });
});

describe("compareByDeptQuarterV13", () => {
  // 算式：cardio Q3 = 10
  it("cardio Q3 = 10", () => {
    const g = compareByDeptQuarterV13(suggestions);
    expect(g.cardio.Q3).toBe(10);
  });
});

describe("suggestionAdoptionV13Routes 读路由", () => {
  it("GET /api/v1/suggestion-adoption 路由存在且 auth:true", () => {
    const route = suggestionAdoptionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/suggestion-adoption",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
