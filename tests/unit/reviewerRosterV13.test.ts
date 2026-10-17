/**
 * 健澜科技 jlmedaios - 评审专家资质与激励 V13 单测（M299-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReviewerRosterV13,
  creditReviewWorkV13,
  eligibleReviewerV13,
  type ReviewerContributorV13,
} from "../../src/bff/aggregators/reviewerRosterV13Aggregator";
import { reviewerRosterV13Routes } from "../../src/bff/routes/reviewerRosterV13";

const contributors: ReviewerContributorV13[] = [
  { doctorId: "d-1", name: "张主任", score: 69, reviewCount: 5 },
  { doctorId: "d-2", name: "李医生", score: 38, reviewCount: 2 },
  { doctorId: "d-3", name: "王医生", score: 21, reviewCount: 0 },
  { doctorId: "d-4", name: "赵医生", score: 80, reviewCount: 10 },
];

describe("eligibleReviewerV13", () => {
  it("score=69 ≥50 → true", () => {
    expect(eligibleReviewerV13(contributors[0])).toBe(true);
  });
  it("score=38 <50 → false", () => {
    expect(eligibleReviewerV13(contributors[1])).toBe(false);
  });
});

describe("creditReviewWorkV13", () => {
  it("base=60 review=5 → 60+10=70", () => {
    expect(creditReviewWorkV13(60, 5)).toBe(70);
  });
  it("clamp：base=100 review=10 → 120 → 100", () => {
    expect(creditReviewWorkV13(100, 10)).toBe(100);
  });
});

describe("buildReviewerRosterV13", () => {
  it("只含 d-4(80) d-1(69)，按分降序", () => {
    const roster = buildReviewerRosterV13(contributors);
    expect(roster.length).toBe(2);
    expect(roster[0].doctorId).toBe("d-4");
    expect(roster[1].doctorId).toBe("d-1");
  });
  it("空态 → 空数组", () => {
    expect(buildReviewerRosterV13([]).length).toBe(0);
  });
});

describe("reviewerRosterV13Routes 读路由", () => {
  it("GET /api/v1/reviewer-roster 路由存在且 auth:true", () => {
    const route = reviewerRosterV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/reviewer-roster",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
