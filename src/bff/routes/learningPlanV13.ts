/**
 * 健澜科技 jlmedaios - 交接后继任者学习计划 V13 路由（M297-B）
 *
 * GET  /api/v1/learning-plan?handoverId=  学习计划
 * POST /api/v1/learning-plan/:id/studied  标记已学（auth）
 *
 * 权限：learning-plan:read / learning-plan:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildLearningPlanV13,
  type HandoverExpV13,
} from "../aggregators/learningPlanV13Aggregator.js";

const experiences: HandoverExpV13[] = [
  { experienceId: "e-1", title: "房颤华法林", bucket: "fresh", transferability: 80, studied: false },
  { experienceId: "e-2", title: "术后低体温", bucket: "stale", transferability: 50, studied: false },
  { experienceId: "e-3", title: "阿司匹林相互作用", bucket: "fresh", transferability: 90, studied: false },
];

export const learningPlanV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/learning-plan",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "learning-plan:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const handoverId = url.searchParams.get("handoverId") ?? "pkg-zhang-li";
      return json(ok(buildLearningPlanV13(handoverId, experiences)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/learning-plan/:id/studied",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "learning-plan:write");
      if (denied) return denied;
      return json(ok({ experienceId: c.params.id, studied: true }));
    },
  },
];
