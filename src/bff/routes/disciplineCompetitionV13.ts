/**
 * 健澜科技 jlmedaios - 学科竞赛 V13 路由（M403-C）
 *
 * GET /api/v1/discipline-competition
 *
 * 权限：discipline-competition:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBestSpecialtyReputationCountV13,
  computeFudanRankingCountV13,
  computeNationalClinicalKeySpecialtyRankingV13,
  type DisciplineCompetitionRecordV13,
} from "../aggregators/disciplineCompetitionV13Aggregator.js";

const records: DisciplineCompetitionRecordV13[] = [
  { nationalRanking: 10, fudanCount: 5, reputationCount: 3 },
  { nationalRanking: 10, fudanCount: 5, reputationCount: 3 },
];

export const disciplineCompetitionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discipline-competition",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discipline-competition:read");
      if (denied) return denied;
      return json(ok({
        nationalClinicalKeySpecialtyRanking: computeNationalClinicalKeySpecialtyRankingV13(records),
        fudanRankingCount: computeFudanRankingCountV13(records),
        bestSpecialtyReputationCount: computeBestSpecialtyReputationCountV13(records),
      }));
    },
  },
];
