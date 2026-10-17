/**
 * 健澜科技 jlmedaios - 志愿服务 V13 路由（M378-C）
 *
 * GET /api/v1/volunteer-service
 *
 * 权限：volunteer-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeVolunteerServiceCountV13,
  computeVolunteerServiceHoursV13,
  computeVolunteerServiceSatisfactionRateV13,
  type VolunteerServiceRecordV13,
} from "../aggregators/volunteerServiceV13Aggregator.js";

const records: VolunteerServiceRecordV13[] = [
  { volunteerServiceCount: 400, volunteerHours: 500, satisfactionCount: 380 },
  { volunteerServiceCount: 400, volunteerHours: 500, satisfactionCount: 380 },
];

export const volunteerServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/volunteer-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "volunteer-service:read");
      if (denied) return denied;
      return json(ok({
        volunteerServiceCount: computeVolunteerServiceCountV13(records),
        volunteerServiceHours: computeVolunteerServiceHoursV13(records),
        volunteerServiceSatisfactionRate: computeVolunteerServiceSatisfactionRateV13(records),
      }));
    },
  },
];
