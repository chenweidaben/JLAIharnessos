/**
 * 健澜科技 jlmedaios - 知识贡献生态总览 V13 路由（M298-D）
 *
 * GET /api/v1/ecosystem-dashboard
 *
 * 权限：ecosystem-dashboard:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEcosystemDashboardV13,
  computeEcosystemHealthV13,
  identifyEcosystemGapV13,
  type EcoEntryV13,
  type MentorPairV13,
} from "../aggregators/ecosystemDashboardV13Aggregator.js";

const leaderboard: EcoEntryV13[] = [
  { doctorId: "d-1", name: "张主任", score: 69 },
  { doctorId: "d-2", name: "李医生", score: 38 },
  { doctorId: "d-3", name: "王医生", score: 21 },
];

const pairs: MentorPairV13[] = [
  { mentorId: "m-1", newDoctorId: "n-1", dept: "cardio" },
];

const newDoctors: EcoEntryV13[] = [
  { doctorId: "n-1", name: "小陈", score: 0 },
];

export const ecosystemDashboardV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ecosystem-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ecosystem-dashboard:read");
      if (denied) return denied;
      const dashboard = buildEcosystemDashboardV13(leaderboard, 1, pairs, newDoctors);
      return json(ok({
        ...dashboard,
        healthScore: computeEcosystemHealthV13(dashboard),
        gap: identifyEcosystemGapV13(dashboard),
      }));
    },
  },
];
