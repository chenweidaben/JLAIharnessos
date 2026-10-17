/**
 * 健澜科技 jlmedaios - 用药知识沉淀与反馈学习 V7 单测（M289-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdherenceV7,
  deriveRuleSuggestionV7,
  tallyOverrideV7,
  type DrugFeedback,
} from "../../src/bff/aggregators/cdsLearningV7Aggregator";
import { cdsLearningV7Routes } from "../../src/bff/routes/cdsLearningV7";

const feedbacks: DrugFeedback[] = [
  { drugCode: "WARFARIN", ruleId: "r1", doctorAction: "a", feedbackType: "accept" },
  { drugCode: "WARFARIN", ruleId: "r1", doctorAction: "b", feedbackType: "override" },
  { drugCode: "WARFARIN", ruleId: "r1", doctorAction: "c", feedbackType: "override" },
  { drugCode: "METFORMIN", ruleId: "r2", doctorAction: "d", feedbackType: "accept" },
];

describe("tallyOverrideV7", () => {
  it("2条override→返回2", () => {
    expect(tallyOverrideV7(feedbacks)).toBe(2);
  });
});

describe("computeAdherenceV7", () => {
  it("r1: 3次命中2次override→遵守率=33.3%", () => {
    // (1 - 2/3) * 100 = 33.33
    expect(computeAdherenceV7("r1", feedbacks)).toBeCloseTo(33.3, 1);
  });
  it("r2: 1次命中0次override→遵守率=100%", () => {
    expect(computeAdherenceV7("r2", feedbacks)).toBe(100);
  });
});

describe("deriveRuleSuggestionV7", () => {
  it("遵守率33.3%<50→red 建议复核下架", () => {
    const r = deriveRuleSuggestionV7({ hitCnt: 3, overrideCnt: 2, adherenceRatePct: 33.3 });
    expect(r.suggestion).toBe("建议复核或下架");
    expect(r.light).toBe("red");
  });
  it("遵守率60%在50-80→yellow 建议优化阈值", () => {
    const r = deriveRuleSuggestionV7({ hitCnt: 10, overrideCnt: 4, adherenceRatePct: 60 });
    expect(r.suggestion).toBe("建议优化阈值");
    expect(r.light).toBe("yellow");
  });
  it("遵守率100%≥80→green 保持", () => {
    expect(deriveRuleSuggestionV7({ hitCnt: 5, overrideCnt: 0, adherenceRatePct: 100 }).light).toBe("green");
  });
});

describe("cdsLearningV7Routes 写权限", () => {
  it("POST /api/v1/cds/feedback/submit 路由存在且 auth:true", () => {
    const post = cdsLearningV7Routes.find((r) => r.method === "POST" && r.path === "/api/v1/cds/feedback/submit");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
