/**
 * 健澜科技 jlmedaios - 人才发展 V13 路由（M397-B）
 *
 * GET /api/v1/talent-development
 *
 * 权限：talent-development:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHighLevelTalentCountV13,
  computeTalentTrainingPlanCompletionRateV13,
  computeTitleStructureCompositionV13,
  type TalentDevelopmentRecordV13,
} from "../aggregators/talentDevelopmentV13Aggregator.js";

const records: TalentDevelopmentRecordV13[] = [
  { highLevelCount: 5, senior: 2, deputySenior: 8, intermediate: 20, junior: 30, completedCount: 45, plannedCount: 50 },
  { highLevelCount: 5, senior: 2, deputySenior: 8, intermediate: 20, junior: 30, completedCount: 45, plannedCount: 50 },
];

export const talentDevelopmentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/talent-development",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "talent-development:read");
      if (denied) return denied;
      return json(ok({
        highLevelTalentCount: computeHighLevelTalentCountV13(records),
        titleStructureComposition: computeTitleStructureCompositionV13(records),
        talentTrainingPlanCompletionRate: computeTalentTrainingPlanCompletionRateV13(records),
      }));
    },
  },
];
