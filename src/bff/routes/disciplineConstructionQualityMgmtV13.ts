/**
 * 健澜科技 jlmedaios - 学科建设质量管理 V13 路由（M434-D，M434 收官，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * GET /api/v1/discipline-construction-quality-mgmt
 *
 * 权限：discipline-construction-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDisciplineInfluenceScoreV13,
  computeDisciplineKeyDisciplineCountV13,
  computeDisciplineLeaderCountV13,
  type DisciplineConstructionQualityMgmtRecordV13,
} from "../aggregators/disciplineConstructionQualityMgmtV13Aggregator.js";

const records: DisciplineConstructionQualityMgmtRecordV13[] = [
  { keyDisciplineCount: 5, leaderCount: 8, influenceScore: 85.5 },
  { keyDisciplineCount: 5, leaderCount: 8, influenceScore: 90.5 },
];

export const disciplineConstructionQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discipline-construction-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discipline-construction-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        disciplineKeyDisciplineCount: computeDisciplineKeyDisciplineCountV13(records),
        disciplineLeaderCount: computeDisciplineLeaderCountV13(records),
        disciplineInfluenceScore: computeDisciplineInfluenceScoreV13(records),
      }));
    },
  },
];
