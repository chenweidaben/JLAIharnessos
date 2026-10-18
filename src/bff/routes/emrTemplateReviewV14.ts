/**
 * 健澜科技 jlmedaios - 模板版本审核工作流 V14 路由（M461-C）
 *
 * POST /api/v1/emr-template-review  （auth:true）提交审核，status 置为 pending_review
 * PUT  /api/v1/emr-template-review/:id （auth:true，body { action: 'approve'|'reject', reviewer, comment? }）批准/驳回
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReviewComment,
  canApprove,
  type ReviewRecordV14,
} from "../aggregators/emrTemplateReviewV14Aggregator.js";

/** 内存态审核记录集（演示用，生产环境应持久化） */
let reviewsState: ReviewRecordV14[] = [
  { id: "R001", templateName: "通用住院模板", version: "v2.1", status: "pending_review", submitter: "王医生", submittedAt: "2026-10-18T08:00:00Z" },
  { id: "R002", templateName: "心内科专科模板", version: "v1.3", status: "pending_review", submitter: "李医生", submittedAt: "2026-10-18T09:00:00Z" },
];

export const emrTemplateReviewV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-review:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ reviews: reviewsState }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-review:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { templateName?: string; version?: string; submitter?: string };
      const record: ReviewRecordV14 = {
        id: `R${Date.now()}`,
        templateName: body.templateName ?? "未命名模板",
        version: body.version ?? "v1.0",
        status: "pending_review",
        submitter: body.submitter ?? "未知用户",
        submittedAt: new Date().toISOString(),
      };
      reviewsState = [...reviewsState, record];
      return json(ok({ review: record }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/emr-template-review/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-review:write");
      if (denied) return denied;
      const reviewId = (c.params.id ?? "").trim();
      const body = await c.req.json().catch(() => ({})) as { action?: "approve" | "reject"; reviewer?: string; comment?: string };
      const target = reviewsState.find((r) => r.id === reviewId);
      if (!target) return json(ok({ error: "未找到审核记录" }));
      const check = canApprove(target);
      if (!check.approve) return json(ok({ error: check.reason }));
      const action = body.action ?? "approve";
      const reviewer = body.reviewer ?? "未知审核人";
      const comment = buildReviewComment(action, reviewer, body.comment);
      const updated: ReviewRecordV14 = {
        ...target,
        status: action === "approve" ? "approved" : "rejected",
        reviewer,
        reviewedAt: new Date().toISOString(),
        comment,
      };
      reviewsState = reviewsState.map((r) => (r.id === reviewId ? updated : r));
      return json(ok({ review: updated }));
    },
  },
];
