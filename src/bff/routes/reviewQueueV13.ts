/**
 * 健澜科技 jlmedaios - 经验质量同行评审 V13 路由（M299-A）
 *
 * GET  /api/v1/review-queue?dept=
 * POST /api/v1/review-queue/:id/review（auth）
 *
 * 权限：review-queue:read / review-queue:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import type { ReviewableExpV13 } from "../aggregators/reviewQueueV13Aggregator.js";

const queue: ReviewableExpV13[] = [
  {
    experienceId: "e-1", title: "房颤华法林", dept: "cardio",
    author: "张主任", status: "pending", reviews: [],
  },
  {
    experienceId: "e-2", title: "术后低体温", dept: "surgery",
    author: "李医生", status: "pending", reviews: [],
  },
];

export const reviewQueueV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/review-queue",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "review-queue:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept");
      if (dept) {
        return json(ok(queue.filter((e) => e.dept === dept)));
      }
      return json(ok(queue));
    },
  },
  {
    method: "POST",
    path: "/api/v1/review-queue/:id/review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "review-queue:write");
      if (denied) return denied;
      return json(ok({ experienceId: c.params.id, reviewed: true }));
    },
  },
];
