/**
 * 健澜科技 jlmedaios - 病历质控专家在线评审 V14 单测（M471-B）
 *
 * 测试 assignExpert / buildReviewResult / aggregateReviewScore 平均分、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateReviewScore,
  assignExpert,
  buildReviewResult,
  type ReviewItemV14,
} from "../../src/bff/aggregators/emrExpertReviewV14Aggregator";
import { emrExpertReviewV14Routes } from "../../src/bff/routes/emrExpertReviewV14";
import type { RouteDef } from "../../src/bff/types";

describe("assignExpert 分配专家", () => {
  // 手算：caseId=C001, expert=王医生 → status='assigned'
  it("caseId=C001, expert=王医生 → status='assigned'", () => {
    const result = assignExpert("C001", "王医生");
    expect(result.status).toBe("assigned");
    expect(result.caseId).toBe("C001");
    expect(result.expert).toBe("王医生");
  });
});

describe("buildReviewResult 提交结果", () => {
  // 手算：score=85, comment="书写规范" → status='submitted'
  it("score=85, comment='书写规范' → status='submitted'", () => {
    const result = buildReviewResult("C001", 85, "书写规范");
    expect(result.status).toBe("submitted");
    expect(result.score).toBe(85);
    expect(result.comment).toBe("书写规范");
  });
});

describe("aggregateReviewScore 平均分", () => {
  // 手算：C001 两次评分 80/90 → avgScore = (80+90)/2 = 170/2 = 85
  it("C001 两次评分 80/90 → avgScore=85", () => {
    const reviews: ReviewItemV14[] = [
      { caseId: "C001", score: 80 },
      { caseId: "C001", score: 90 },
    ];
    const aggregated = aggregateReviewScore(reviews);
    expect(aggregated[0]?.avgScore).toBe(85);
  });
});

describe("aggregateReviewScore 空数组", () => {
  // 手算：空数组 → 返回空数组 []
  it("空数组 → 返回空数组", () => {
    expect(aggregateReviewScore([])).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-expert-review auth:true", () => {
    const def = (emrExpertReviewV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-expert-review");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
