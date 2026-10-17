/**
 * 健澜科技 jlmedaios - 评审专家资质与激励 V13 路由（M299-C）
 *
 * GET /api/v1/reviewer-roster
 *
 * 权限：reviewer-roster:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReviewerRosterV13,
  type ReviewerContributorV13,
} from "../aggregators/reviewerRosterV13Aggregator.js";

const contributors: ReviewerContributorV13[] = [
  { doctorId: "d-1", name: "张主任", score: 69, reviewCount: 5 },
  { doctorId: "d-2", name: "李医生", score: 38, reviewCount: 2 },
  { doctorId: "d-3", name: "王医生", score: 21, reviewCount: 0 },
  { doctorId: "d-4", name: "赵医生", score: 80, reviewCount: 10 },
];

export const reviewerRosterV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/reviewer-roster",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "reviewer-roster:read");
      if (denied) return denied;
      return json(ok(buildReviewerRosterV13(contributors)));
    },
  },
];
