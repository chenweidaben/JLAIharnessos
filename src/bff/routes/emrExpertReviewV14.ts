/**
 * 健澜科技 jlmedaios - 病历质控专家在线评审 V14 路由（M471-B）
 *
 * GET  /api/v1/emr-expert-review        （read，auth:true）返回待评审列表
 * POST /api/v1/emr-expert-review/:id   （auth:true，path 参数 c.params.id，body 用 await c.req.json()）提交评审意见
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateReviewScore,
  buildReviewResult,
  type ReviewItemV14,
} from "../aggregators/emrExpertReviewV14Aggregator.js";

const demoReviews: ReviewItemV14[] = [
  { caseId: "C001", score: 80 },
  { caseId: "C001", score: 90 },
  { caseId: "C002", score: 85 },
];

export const emrExpertReviewV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-expert-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-expert-review:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const aggregated = aggregateReviewScore(demoReviews);
      return json(ok({ pending: demoReviews.length, aggregated }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-expert-review/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-expert-review:write");
      if (denied) return denied;
      const id = (c.params.id ?? "").trim();
      const body = await c.req.json().catch(() => ({})) as { score?: number; comment?: string };
      const result = buildReviewResult(id, body.score ?? 0, body.comment ?? "");
      return json(ok({ result }));
    },
  },
];
