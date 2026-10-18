/**
 * 健澜科技 jlmedaios - 科研项目管理 V13 路由（M443-C，教学科研与继续教育管理组）
 *
 * GET /api/v1/research-project-mgmt
 *
 * 权限：research-project-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeResearchProjectAchievementTransformCountV13,
  computeResearchProjectApprovedCountV13,
  computeResearchProjectFundingArrivalRateV13,
  type ResearchProjectMgmtRecordV13,
} from "../aggregators/researchProjectMgmtV13Aggregator.js";

const records: ResearchProjectMgmtRecordV13[] = [
  { fundingArrived: 950, shouldArrive: 1000, transformed: true },
  { fundingArrived: 950, shouldArrive: 1000, transformed: true },
];

export const researchProjectMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-project-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-project-mgmt:read");
      if (denied) return denied;
      return json(ok({
        researchProjectApprovedCount: computeResearchProjectApprovedCountV13(records),
        researchProjectFundingArrivalRate: computeResearchProjectFundingArrivalRateV13(records),
        researchProjectAchievementTransformCount: computeResearchProjectAchievementTransformCountV13(records),
      }));
    },
  },
];
