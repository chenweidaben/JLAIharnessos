/**
 * 健澜科技 jlmedaios - 学术交流管理 V13 路由（M456-C，学科建设与科研管理组）
 *
 * GET /api/v1/academic-exchange-mgmt
 *
 * 权限：academic-exchange-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAcademicExchangeActivityCountV13,
  computeAcademicExchangeAttendeeCountV13,
  computeAcademicExchangeContinuingEducationCountV13,
  type AcademicExchangeMgmtRecordV13,
} from "../aggregators/academicExchangeMgmtV13Aggregator.js";

const records: AcademicExchangeMgmtRecordV13[] = [
  { activityCount: 950, attendeeCount: 900, continuingEduCount: 980 },
  { activityCount: 950, attendeeCount: 900, continuingEduCount: 980 },
];

export const academicExchangeMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/academic-exchange-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "academic-exchange-mgmt:read");
      if (denied) return denied;
      return json(ok({
        academicExchangeActivityCount: computeAcademicExchangeActivityCountV13(records),
        academicExchangeAttendeeCount: computeAcademicExchangeAttendeeCountV13(records),
        academicExchangeContinuingEducationCount: computeAcademicExchangeContinuingEducationCountV13(records),
      }));
    },
  },
];
