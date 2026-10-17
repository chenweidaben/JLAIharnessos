/**
 * 健澜科技 jlmedaios - 过期经验复核工作流 V13 路由（M296-B）
 *
 * GET  /api/v1/experience-review             复核队列
 * POST /api/v1/experience-review/:id/resolve  复核决策（auth）
 *
 * 权限：experience-review:read / experience-review:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReviewQueueV13,
  buildReviewTaskV13,
  type StaleExperienceV13,
} from "../aggregators/experienceReviewV13Aggregator.js";

const staleExperiences: StaleExperienceV13[] = [
  { experienceId: "e-1", title: "房颤华法林", monthsAgo: 30, author: "张主任" },
  { experienceId: "e-2", title: "VTE 预防", monthsAgo: 40, author: "李医生" },
  { experienceId: "e-3", title: "术后低体温", monthsAgo: 25, author: "王医生" },
];

export const experienceReviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/experience-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-review:read");
      if (denied) return denied;
      const tasks = buildReviewTaskV13(staleExperiences);
      return json(ok({ tasks, summary: buildReviewQueueV13(tasks) }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/experience-review/:id/resolve",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-review:write");
      if (denied) return denied;
      return json(ok({ taskId: c.params.id, resolved: true }));
    },
  },
];
