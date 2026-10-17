/**
 * 健澜科技 jlmedaios - 经验时间衰减与新鲜度 V13 路由（M296-A）
 *
 * GET /api/v1/experience-freshness?role=doctor
 *
 * 权限：experience-freshness:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildExperienceFreshnessV13,
  type ExperienceFreshV13,
} from "../aggregators/experienceFreshnessV13Aggregator.js";

const experiences: ExperienceFreshV13[] = [
  { experienceId: "e-1", title: "房颤华法林", monthsAgo: 6 },
  { experienceId: "e-2", title: "术后低体温", monthsAgo: 18 },
  { experienceId: "e-3", title: "阿司匹林相互作用", monthsAgo: 30 },
  { experienceId: "e-4", title: "VTE 预防", monthsAgo: 40 },
];

export const experienceFreshnessV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/experience-freshness",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-freshness:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const role = url.searchParams.get("role") ?? "doctor";
      const rows = buildExperienceFreshnessV13(experiences);
      return json(ok({ role, count: rows.length, rows }));
    },
  },
];
