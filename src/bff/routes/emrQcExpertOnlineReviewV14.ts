/**
 * 健澜科技 jlmedaios - 质控专家在线评审 V14 路由（M502-B）
 *
 * POST /api/v1/emr-qc-expert-online-review  （auth:true）在线评审提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildReviewReport, submitReview, type ExpertReviewV14 } from "../aggregators/emrQcExpertOnlineReviewV14Aggregator.js";

let sampleReviews: ExpertReviewV14[] = [
  submitReview("张教授", "R001", 92, "书写规范"),
  submitReview("李教授", "R002", 85, "基本合格"),
];

export const emrQcExpertOnlineReviewV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-expert-online-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-expert-online-review:write");
      if (denied) return denied;
      const body = await c.req.json();
      const expert = typeof body?.expert === "string" ? body.expert : "";
      const recordId = typeof body?.recordId === "string" ? body.recordId : "";
      const score = typeof body?.score === "number" ? body.score : 0;
      const comment = typeof body?.comment === "string" ? body.comment : "";
      const review = submitReview(expert, recordId, score, comment);
      sampleReviews = [...sampleReviews, review];
      const report = buildReviewReport(sampleReviews);
      return json(ok({ review, report }));
    },
  },
];
