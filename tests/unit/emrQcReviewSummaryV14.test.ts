/**
 * 健澜科技 jlmedaios - 质控评审意见汇总 V14 单测（M502-C）
 *
 * 测试 aggregateReviews 汇总、buildReviewSummary 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateReviews,
  buildReviewSummary,
  type ReviewItemV14,
  type ReviewSummaryV14,
} from "../../src/bff/aggregators/emrQcReviewSummaryV14Aggregator";
import { emrQcReviewSummaryV14Routes } from "../../src/bff/routes/emrQcReviewSummaryV14";
import type { RouteDef } from "../../src/bff/types";

describe("aggregateReviews 三评审", () => {
  // 手算：3 条评审（92/85/88）→ total=3, avgScore=88.3, positive=3（92/85/88 均 >=80，3 条好评）
  it("3 条评审 → total=3, avgScore=88.3, positive=3", () => {
    const reviews: ReviewItemV14[] = [
      { expert: "张教授", score: 92, comment: "书写规范" },
      { expert: "李教授", score: 85, comment: "基本合格" },
      { expert: "王教授", score: 88, comment: "良好" },
    ];
    const result = aggregateReviews(reviews);
    expect(result.total).toBe(3);
    expect(result.avgScore).toBeCloseTo(88.3);
    expect(result.positive).toBe(3);
  });
});

describe("aggregateReviews 空数组", () => {
  // 手算：空数组 → total=0, avgScore=0, positive=0
  it("空数组 → total=0, avgScore=0, positive=0", () => {
    const reviews: ReviewItemV14[] = [];
    const result = aggregateReviews(reviews);
    expect(result.total).toBe(0);
    expect(result.avgScore).toBe(0);
    expect(result.positive).toBe(0);
  });
});

describe("buildReviewSummary 三评审汇总", () => {
  // 手算：{total:3, avgScore:88.3, positive:3} → 正确构建（好评率 100%）
  it("{total:3, avgScore:88.3, positive:3} → 正确构建", () => {
    const summary: ReviewSummaryV14 = { total: 3, avgScore: 88.3, positive: 3 };
    const report = buildReviewSummary(summary);
    expect(report.total).toBe(3);
    expect(report.avgScore).toBe(88.3);
    expect(report.positive).toBe(3);
  });
});

describe("aggregateReviews 两评审", () => {
  // 手算：2 条评审（95/90）→ total=2, avgScore=92.5, positive=2（2 条都>=80）
  it("2 条评审（95/90）→ total=2, avgScore=92.5, positive=2", () => {
    const reviews: ReviewItemV14[] = [
      { expert: "张教授", score: 95, comment: "优秀" },
      { expert: "李教授", score: 90, comment: "良好" },
    ];
    const result = aggregateReviews(reviews);
    expect(result.total).toBe(2);
    expect(result.avgScore).toBeCloseTo(92.5);
    expect(result.positive).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-review-summary auth:true", () => {
    const def = (emrQcReviewSummaryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-review-summary");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
