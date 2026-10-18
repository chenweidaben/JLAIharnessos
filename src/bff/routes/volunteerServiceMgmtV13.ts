/**
 * 健澜科技 jlmedaios - 志愿者服务管理 V13 路由（M457-B，医院文化与公益管理组）
 *
 * GET /api/v1/volunteer-service-mgmt
 *
 * 权限：volunteer-service-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeVolunteerServiceCoverageRateV13,
  computeVolunteerServiceHoursV13,
  computeVolunteerServiceRegisteredCountV13,
  type VolunteerServiceMgmtRecordV13,
} from "../aggregators/volunteerServiceMgmtV13Aggregator.js";

const records: VolunteerServiceMgmtRecordV13[] = [
  { registeredCount: 950, serviceHours: 900, covered: 980, totalDept: 1000 },
  { registeredCount: 950, serviceHours: 900, covered: 980, totalDept: 1000 },
];

export const volunteerServiceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/volunteer-service-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "volunteer-service-mgmt:read");
      if (denied) return denied;
      return json(ok({
        volunteerServiceRegisteredCount: computeVolunteerServiceRegisteredCountV13(records),
        volunteerServiceHours: computeVolunteerServiceHoursV13(records),
        volunteerServiceCoverageRate: computeVolunteerServiceCoverageRateV13(records),
      }));
    },
  },
];
