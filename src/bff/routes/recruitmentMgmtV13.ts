/**
 * 健澜科技 jlmedaios - 人员招聘与配置 V13 路由（M444-C，绩效薪酬与人力资源管理组）
 *
 * GET /api/v1/recruitment-mgmt
 *
 * 权限：recruitment-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRecruitmentPlanCompletionRateV13,
  computeRecruitmentPositionMatchingRateV13,
  computeRecruitmentRetention3MonthsRateV13,
  type RecruitmentMgmtRecordV13,
} from "../aggregators/recruitmentMgmtV13Aggregator.js";

const records: RecruitmentMgmtRecordV13[] = [
  { recruited: 950, plan: 1000, matched: 900, onboarded: 1000, retained3Months: 980 },
  { recruited: 950, plan: 1000, matched: 900, onboarded: 1000, retained3Months: 980 },
];

export const recruitmentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/recruitment-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "recruitment-mgmt:read");
      if (denied) return denied;
      return json(ok({
        recruitmentPlanCompletionRate: computeRecruitmentPlanCompletionRateV13(records),
        recruitmentPositionMatchingRate: computeRecruitmentPositionMatchingRateV13(records),
        recruitmentRetention3MonthsRate: computeRecruitmentRetention3MonthsRateV13(records),
      }));
    },
  },
];
