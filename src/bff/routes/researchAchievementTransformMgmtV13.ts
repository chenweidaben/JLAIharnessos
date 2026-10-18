/**
 * 健澜科技 jlmedaios - 科研成果转化管理 V13 路由（M456-B，学科建设与科研管理组）
 *
 * GET /api/v1/research-achievement-transform-mgmt
 *
 * 权限：research-achievement-transform-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeResearchAchievementTransformHorizontalFundRateV13,
  computeResearchAchievementTransformRateV13,
  computeResearchAchievementTransformRegistrationCountV13,
  type ResearchAchievementTransformMgmtRecordV13,
} from "../aggregators/researchAchievementTransformMgmtV13Aggregator.js";

const records: ResearchAchievementTransformMgmtRecordV13[] = [
  { achievementCount: 950, transformed: 900, totalRegistered: 1000, received: 980, totalContract: 1000 },
  { achievementCount: 950, transformed: 900, totalRegistered: 1000, received: 980, totalContract: 1000 },
];

export const researchAchievementTransformMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-achievement-transform-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-achievement-transform-mgmt:read");
      if (denied) return denied;
      return json(ok({
        researchAchievementTransformRegistrationCount: computeResearchAchievementTransformRegistrationCountV13(records),
        researchAchievementTransformRate: computeResearchAchievementTransformRateV13(records),
        researchAchievementTransformHorizontalFundRate: computeResearchAchievementTransformHorizontalFundRateV13(records),
      }));
    },
  },
];
