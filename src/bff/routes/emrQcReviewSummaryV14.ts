/**
 * 健澜科技 jlmedaios - 质控评审意见汇总 V14 路由（M502-C）
 *
 * GET /api/v1/emr-qc-review-summary  （read，auth:true）返回事审意见汇总
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateReviews, buildReviewSummary, type ReviewItemV14 } from "../aggregators/emrQcReviewSummaryV14Aggregator.js";

const sampleReviews: ReviewItemV14[] = [
  { expert: "张教授", score: 92, comment: "书写规范" },
  { expert: "李教授", score: 85, comment: "基本合格" },
  { expert: "王教授", score: 88, comment: "良好" },
];

const summary = aggregateReviews(sampleReviews);
const report = buildReviewSummary(summary);

export const emrQcReviewSummaryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-review-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-review-summary:read");
      if (denied) return denied;
      return json(ok({ reviews: sampleReviews, summary, report }));
    },
  },
];
