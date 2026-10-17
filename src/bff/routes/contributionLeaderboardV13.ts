/**
 * 健澜科技 jlmedaios - 专家经验贡献激励 V13 路由（M298-A）
 *
 * GET /api/v1/contribution-leaderboard?dept=
 *
 * 权限：contribution-leaderboard:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildContributionLeaderboardV13,
  type ContributorV13,
} from "../aggregators/contributionLeaderboardV13Aggregator.js";

const contributors: ContributorV13[] = [
  { doctorId: "d-1", name: "张主任", reuseCount: 10, adoptionRate: 80, errorReduction: 5 },
  { doctorId: "d-2", name: "李医生", reuseCount: 5, adoptionRate: 60, errorReduction: 2 },
  { doctorId: "d-3", name: "王医生", reuseCount: 2, adoptionRate: 40, errorReduction: 1 },
];

export const contributionLeaderboardV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/contribution-leaderboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "contribution-leaderboard:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("dept");
      return json(ok(buildContributionLeaderboardV13(contributors)));
    },
  },
];
