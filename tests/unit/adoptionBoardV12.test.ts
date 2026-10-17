/**
 * 健澜科技 jlmedaios - 智能体采纳率反馈看板 V12 单测（M294-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAdoptionBoardV12,
  computeAdoptionRateV12,
  detectLowAdoptionV12,
  type FeedbackV12,
  type SuggestionV12,
} from "../../src/bff/aggregators/adoptionBoardV12Aggregator";
import { adoptionBoardV12Routes } from "../../src/bff/routes/adoptionBoardV12";

const suggestions: SuggestionV12[] = [
  { suggestionId: "sg-1", ruleId: "r-dose", status: "adopted" },
  { suggestionId: "sg-2", ruleId: "r-dose", status: "corrected" },
  { suggestionId: "sg-3", ruleId: "r-interaction", status: "adopted" },
];

const feedback: FeedbackV12[] = [
  { feedbackId: "fb-1", suggestionId: "sg-1", type: "adopt" },
  { feedbackId: "fb-2", suggestionId: "sg-2", type: "correct" },
  { feedbackId: "fb-3", suggestionId: "sg-3", type: "adopt" },
];

describe("computeAdoptionRateV12", () => {
  it("采纳2/3 → 66.7%", () => {
    expect(computeAdoptionRateV12(2, 3)).toBe(66.7);
  });
  it("total=0 → 0", () => {
    expect(computeAdoptionRateV12(0, 0)).toBe(0);
  });
});

describe("detectLowAdoptionV12", () => {
  it("rate=40 → autoDowngrade=true", () => {
    const r = detectLowAdoptionV12(40);
    expect(r.autoDowngrade).toBe(true);
  });
  it("rate=60 → autoDowngrade=false", () => {
    const r = detectLowAdoptionV12(60);
    expect(r.autoDowngrade).toBe(false);
  });
});

describe("buildAdoptionBoardV12", () => {
  it("聚合2条规则，r-dose(adopt1/correct1)、r-interaction(adopt1)", () => {
    const b = buildAdoptionBoardV12("all", suggestions, feedback);
    expect(b.rows.length).toBe(2);
    expect(b.totalSuggestions).toBe(3);
    expect(b.totalAdopt).toBe(2);
    const dose = b.rows.find((r) => r.ruleId === "r-dose");
    expect(dose?.adoptCount).toBe(1);
    expect(dose?.correctCount).toBe(1);
    expect(dose?.adoptionRate).toBe(50);
  });
  it("空态→rows空、总数0", () => {
    const b = buildAdoptionBoardV12("all", [], []);
    expect(b.rows.length).toBe(0);
    expect(b.totalSuggestions).toBe(0);
    expect(b.overallAdoptionRate).toBe(0);
  });
});

describe("adoptionBoardV12Routes 读路由", () => {
  it("GET /api/v1/agent-adoption-board 路由存在且 auth:true", () => {
    const route = adoptionBoardV12Routes.find((r) => r.method === "GET" && r.path === "/api/v1/agent-adoption-board");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
