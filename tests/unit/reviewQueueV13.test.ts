/**
 * 健澜科技 jlmedaios - 经验质量同行评审 V13 单测（M299-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  isApprovedV13,
  reviewExperienceV13,
  submitExperienceForReviewV13,
  type ReviewableExpV13,
} from "../../src/bff/aggregators/reviewQueueV13Aggregator";
import { reviewQueueV13Routes } from "../../src/bff/routes/reviewQueueV13";

const initialQueue: ReviewableExpV13[] = [];

describe("submitExperienceForReviewV13", () => {
  it("新经验进队：status=pending reviews=[]", () => {
    const q = submitExperienceForReviewV13(
      { experienceId: "e-1", title: "房颤", dept: "cardio", author: "张主任" },
      initialQueue,
    );
    expect(q.length).toBe(1);
    expect(q[0].status).toBe("pending");
    expect(q[0].reviews.length).toBe(0);
  });
});

describe("reviewExperienceV13", () => {
  it("打分累计：追加1条 review", () => {
    const e: ReviewableExpV13 = {
      experienceId: "e-1", title: "房颤", dept: "cardio",
      author: "张主任", status: "pending", reviews: [],
    };
    const e2 = reviewExperienceV13(e, "r-1", 4, "好");
    expect(e2.reviews.length).toBe(1);
    expect(e2.reviews[0].score).toBe(4);
  });
  it("score clamp：传6 → 5", () => {
    const e: ReviewableExpV13 = {
      experienceId: "e-1", title: "房颤", dept: "cardio",
      author: "张主任", status: "pending", reviews: [],
    };
    const e2 = reviewExperienceV13(e, "r-1", 6, "满分");
    expect(e2.reviews[0].score).toBe(5);
  });
});

describe("isApprovedV13", () => {
  it("2条评审 4+4 avg=4 ≥3.5 → approved", () => {
    const e: ReviewableExpV13 = {
      experienceId: "e-1", title: "房颤", dept: "cardio", author: "张主任",
      status: "pending",
      reviews: [
        { reviewerId: "r-1", score: 4, comment: "好" },
        { reviewerId: "r-2", score: 4, comment: "好" },
      ],
    };
    expect(isApprovedV13(e)).toBe("approved");
  });
  it("2条评审 2+2 avg=2 <3.5 → rejected", () => {
    const e: ReviewableExpV13 = {
      experienceId: "e-2", title: "术后", dept: "surgery", author: "李医生",
      status: "pending",
      reviews: [
        { reviewerId: "r-1", score: 2, comment: "差" },
        { reviewerId: "r-2", score: 2, comment: "差" },
      ],
    };
    expect(isApprovedV13(e)).toBe("rejected");
  });
  it("不足2人 → pending", () => {
    const e: ReviewableExpV13 = {
      experienceId: "e-3", title: "x", dept: "cardio", author: "王",
      status: "pending",
      reviews: [{ reviewerId: "r-1", score: 5, comment: "好" }],
    };
    expect(isApprovedV13(e)).toBe("pending");
  });
});

describe("reviewQueueV13Routes 写路由", () => {
  it("POST /api/v1/review-queue/:id/review 路由存在且 auth:true", () => {
    const route = reviewQueueV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/review-queue/:id/review",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
