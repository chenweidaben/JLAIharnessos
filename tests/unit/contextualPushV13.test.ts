/**
 * 健澜科技 jlmedaios - 经验精准主动推送 V13 单测（M302-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  rankExperienceForContextV13,
  selectTopPushV13,
  suppressAlreadySeenV13,
  type PushExperienceV13,
} from "../../src/bff/aggregators/contextualPushV13Aggregator";
import { contextualPushV13Routes } from "../../src/bff/routes/contextualPushV13";

const candidates: PushExperienceV13[] = [
  { experienceId: "e-1", title: "房颤华法林", dept: "cardio", disease: "afib", freshnessScore: 90, evidenceStrength: 0.9 },
  { experienceId: "e-2", title: "术后低体温", dept: "surgery", disease: "postop", freshnessScore: 70, evidenceStrength: 0.5 },
  { experienceId: "e-3", title: "房颤阿司匹林", dept: "cardio", disease: "afib", freshnessScore: 60, evidenceStrength: 0.3 },
];

describe("rankExperienceForContextV13", () => {
  it("dept=cardio disease=afib：e-1(18.79) > e-2(14.05) > e-3(12.73)", () => {
    const ranked = rankExperienceForContextV13(candidates, "cardio", "afib");
    expect(ranked[0].experienceId).toBe("e-1");
    expect(ranked[0].score).toBe(18.79);
    expect(ranked[1].experienceId).toBe("e-2");
    expect(ranked[2].experienceId).toBe("e-3");
  });
});

describe("selectTopPushV13", () => {
  it("取前2条", () => {
    const ranked = rankExperienceForContextV13(candidates, "cardio", "afib");
    const top = selectTopPushV13(ranked, 2);
    expect(top.length).toBe(2);
    expect(top[0].experienceId).toBe("e-1");
  });
  it("空态 → 0", () => {
    expect(selectTopPushV13([], 5).length).toBe(0);
  });
});

describe("suppressAlreadySeenV13", () => {
  it("seen=[e-3] → 剔除 e-3，剩 e-1 e-2", () => {
    const ranked = rankExperienceForContextV13(candidates, "cardio", "afib");
    const unseen = suppressAlreadySeenV13(ranked, ["e-3"]);
    expect(unseen.length).toBe(2);
    expect(unseen.every((r) => r.experienceId !== "e-3")).toBe(true);
  });
});

describe("contextualPushV13Routes 读路由", () => {
  it("GET /api/v1/contextual-push 路由存在且 auth:true", () => {
    const route = contextualPushV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/contextual-push",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
