/**
 * 健澜科技 jlmedaios - 人员招聘 V13 路由（M384-A）
 *
 * GET /api/v1/staff-recruitment
 *
 * 权限：staff-recruitment:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHiredCountV13,
  computeRecruitmentOnboardRateV13,
  computeRecruitmentPositionCountV13,
  type StaffRecruitmentRecordV13,
} from "../aggregators/staffRecruitmentV13Aggregator.js";

const records: StaffRecruitmentRecordV13[] = [
  { positionCount: 50, hiredCount: 80, onboardCount: 72 },
  { positionCount: 50, hiredCount: 80, onboardCount: 72 },
];

export const staffRecruitmentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-recruitment",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-recruitment:read");
      if (denied) return denied;
      return json(ok({
        recruitmentPositionCount: computeRecruitmentPositionCountV13(records),
        hiredCount: computeHiredCountV13(records),
        recruitmentOnboardRate: computeRecruitmentOnboardRateV13(records),
      }));
    },
  },
];
