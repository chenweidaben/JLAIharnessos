/**
 * 健澜科技 jlmedaios - 经验资产运营与退役 V13 路由（M305-A）
 *
 * GET /api/v1/experience-asset?doctorId=
 *
 * 权限：experience-asset:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  identifyStaleExperienceV13,
  scoreAssetValueV13,
  type AssetExperienceV13,
} from "../aggregators/experienceAssetV13Aggregator.js";

const exps: AssetExperienceV13[] = [
  { experienceId: "e-1", title: "房颤华法林", recentUseCount: 5, evidenceStrength: 0.8, freshnessScore: 90, daysSinceLastUse: 30, status: "active" },
  { experienceId: "e-2", title: "旧版阿司匹林", recentUseCount: 0, evidenceStrength: 0.3, freshnessScore: 20, daysSinceLastUse: 200, status: "active" },
];

export const experienceAssetV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/experience-asset",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-asset:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("doctorId");
      return json(ok({
        scores: exps.map((e) => ({
          experienceId: e.experienceId,
          title: e.title,
          score: scoreAssetValueV13(e),
          stale: identifyStaleExperienceV13(e),
        })),
      }));
    },
  },
];
