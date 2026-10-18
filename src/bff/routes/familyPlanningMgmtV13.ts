/**
 * 健澜科技 jlmedaios - 计划生育技术服务 V13 路由（M442-D，M442 收官，妇幼健康与计划生育管理组）
 *
 * GET /api/v1/family-planning-mgmt
 *
 * 权限：family-planning-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFamilyPlanningComplicationRateV13,
  computeFamilyPlanningCounselingRateV13,
  computeFamilyPlanningFollowUpRateV13,
  type FamilyPlanningMgmtRecordV13,
} from "../aggregators/familyPlanningMgmtV13Aggregator.js";

const records: FamilyPlanningMgmtRecordV13[] = [
  { counseled: 950, shouldCounsel: 1000, complicationCount: 5, totalSurgery: 1000, followedUp: 980, shouldFollowUp: 1000 },
  { counseled: 950, shouldCounsel: 1000, complicationCount: 5, totalSurgery: 1000, followedUp: 980, shouldFollowUp: 1000 },
];

export const familyPlanningMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/family-planning-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "family-planning-mgmt:read");
      if (denied) return denied;
      return json(ok({
        familyPlanningCounselingRate: computeFamilyPlanningCounselingRateV13(records),
        familyPlanningComplicationRate: computeFamilyPlanningComplicationRateV13(records),
        familyPlanningFollowUpRate: computeFamilyPlanningFollowUpRateV13(records),
      }));
    },
  },
];
