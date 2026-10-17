/**
 * 健澜科技 jlmedaios - 学科建设 V13 路由（M397-A）
 *
 * GET /api/v1/discipline-construction
 *
 * 权限：discipline-construction:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDisciplineLeaderCountV13,
  computeKeyDisciplineCountV13,
  computeSpecialtyReputationRankV13,
  type DisciplineConstructionRecordV13,
} from "../aggregators/disciplineConstructionV13Aggregator.js";

const records: DisciplineConstructionRecordV13[] = [
  { keyDisciplineCount: 5, leaderCount: 3, rank: 5, deptName: "心血管内科" },
  { keyDisciplineCount: 5, leaderCount: 3, rank: 8, deptName: "消化内科" },
];

export const disciplineConstructionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discipline-construction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discipline-construction:read");
      if (denied) return denied;
      return json(ok({
        keyDisciplineCount: computeKeyDisciplineCountV13(records),
        disciplineLeaderCount: computeDisciplineLeaderCountV13(records),
        specialtyReputationRank: computeSpecialtyReputationRankV13(records),
      }));
    },
  },
];
