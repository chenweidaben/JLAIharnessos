/**
 * 健澜科技 jlmedaios - 科际协作与经验共享总览 V13 路由（M308-D）
 *
 * GET /api/v1/dept-collab-overview
 *
 * 权限：dept-collab-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeptCollabOverviewV13,
  computeDeptCollabScoreV13,
  identifyDeptCollabGapV13,
  type DeptBoardInputV13,
  type SopInputV13,
} from "../aggregators/deptCollabOverviewV13Aggregator.js";

const depts: DeptBoardInputV13[] = [
  { dept: "cardio", closedRate: 33, overdueCount: 1 },
  { dept: "surgery", closedRate: 0, overdueCount: 2 },
  { dept: "pediatrics", closedRate: 0, overdueCount: 0 },
];

const sops: SopInputV13[] = [
  { dept: "cardio" },
  { dept: "cardio" },
  { dept: "surgery" },
];

export const deptCollabOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-collab-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-collab-overview:read");
      if (denied) return denied;
      const overview = buildDeptCollabOverviewV13({ depts, sops });
      return json(ok({
        overview,
        score: computeDeptCollabScoreV13(overview),
        gap: identifyDeptCollabGapV13(overview),
      }));
    },
  },
];
