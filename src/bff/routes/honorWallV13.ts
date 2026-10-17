/**
 * 健澜科技 jlmedaios - 贡献荣誉墙与月度之星 V13 路由（M298-B）
 *
 * GET /api/v1/honor-wall
 *
 * 权限：honor-wall:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHonorWallV13,
  computeContributionTrendV13,
  selectMonthlyStarV13,
  type HonorEntryV13,
} from "../aggregators/honorWallV13Aggregator.js";

const leaderboard: HonorEntryV13[] = [
  { doctorId: "d-1", name: "张主任", score: 69, badge: "良师" },
  { doctorId: "d-2", name: "李医生", score: 38, badge: "分享者" },
  { doctorId: "d-3", name: "王医生", score: 21, badge: "新人" },
  { doctorId: "d-4", name: "赵医生", score: 15, badge: "新人" },
];

const prevWinners = ["d-1"];

export const honorWallV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/honor-wall",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "honor-wall:read");
      if (denied) return denied;
      const wall = buildHonorWallV13(leaderboard);
      const star = selectMonthlyStarV13(leaderboard, prevWinners);
      const trend = computeContributionTrendV13(45, 40);
      return json(ok({ ...wall, monthlyStar: star, trendDelta: trend }));
    },
  },
];
