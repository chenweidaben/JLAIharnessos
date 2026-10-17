/**
 * 健澜科技 jlmedaios - 知识资产生命周期总览 V13 路由（M296-D）
 *
 * GET /api/v1/knowledge-lifecycle 生命周期总览
 *
 * 权限：knowledge-lifecycle:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildKnowledgeLifecycleV13,
  computeLifecycleHealthV13,
  identifyLifecycleGapV13,
  type LifecycleInputV13,
} from "../aggregators/knowledgeLifecycleV13Aggregator.js";

const experiences: LifecycleInputV13[] = [
  { experienceId: "e-1", bucket: "fresh" },
  { experienceId: "e-2", bucket: "fresh" },
  { experienceId: "e-3", bucket: "aging" },
  { experienceId: "e-4", bucket: "stale" },
  { experienceId: "e-5", bucket: "archive" },
];

export const knowledgeLifecycleV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/knowledge-lifecycle",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-lifecycle:read");
      if (denied) return denied;
      const overview = buildKnowledgeLifecycleV13(experiences, 3);
      return json(ok({
        ...overview,
        healthScore: computeLifecycleHealthV13(overview),
        gaps: identifyLifecycleGapV13(overview),
      }));
    },
  },
];
