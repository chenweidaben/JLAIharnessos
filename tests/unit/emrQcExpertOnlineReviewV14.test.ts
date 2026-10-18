/**
 * 健澜科技 jlmedaios - 质控专家在线评审 V14 单测（M502-B）
 *
 * 测试 submitReview 提交、buildReviewReport 构建报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReviewReport,
  submitReview,
  type ExpertReviewV14,
} from "../../src/bff/aggregators/emrQcExpertOnlineReviewV14Aggregator";
import { emrQcExpertOnlineReviewV14Routes } from "../../src/bff/routes/emrQcExpertOnlineReviewV14";
import type { RouteDef } from "../../src/bff/types";

describe("submitReview 张教授", () => {
  // 手算：expert='张教授', recordId='R001', score=92, comment='书写规范' → 正确构建
  it("expert='张教授', recordId='R001', score=92, comment='书写规范' → 正确构建", () => {
    const review: ExpertReviewV14 = submitReview("张教授", "R001", 92, "书写规范");
    expect(review.expert).toBe("张教授");
    expect(review.recordId).toBe("R001");
    expect(review.score).toBe(92);
  });
});

describe("buildReviewReport 三评审", () => {
  // 手算：3 条评审（92/85/88）→ total=3, avgScore=88.3（(92+85+88)/3=265/3≈88.3）
  it("3 条评审 → total=3, avgScore=88.3", () => {
    const reviews: ExpertReviewV14[] = [
      submitReview("张教授", "R001", 92, "书写规范"),
      submitReview("李教授", "R002", 85, "基本合格"),
      submitReview("王教授", "R003", 88, "良好"),
    ];
    const report = buildReviewReport(reviews);
    expect(report.total).toBe(3);
    expect(report.avgScore).toBeCloseTo(88.3);
  });
});

describe("buildReviewReport 空数组", () => {
  // 手算：空数组 → total=0, avgScore=0
  it("空数组 → total=0, avgScore=0", () => {
    const reviews: ExpertReviewV14[] = [];
    const report = buildReviewReport(reviews);
    expect(report.total).toBe(0);
    expect(report.avgScore).toBe(0);
  });
});

describe("submitReview 李教授", () => {
  // 手算：expert='李教授', recordId='R002', score=95, comment='优秀病历' → 正确构建
  it("expert='李教授', recordId='R002', score=95, comment='优秀病历' → 正确构建", () => {
    const review: ExpertReviewV14 = submitReview("李教授", "R002", 95, "优秀病历");
    expect(review.expert).toBe("李教授");
    expect(review.score).toBe(95);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-expert-online-review auth:true", () => {
    const def = (emrQcExpertOnlineReviewV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-expert-online-review");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
