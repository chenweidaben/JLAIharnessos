/**
 * 健澜科技 jlmedaios - 健康体检 V13 路由（M399-D，M399 收官）
 *
 * GET /api/v1/health-checkup
 *
 * 权限：health-checkup:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHealthCheckupAbnormalFollowupRateV13,
  computeHealthCheckupCountV13,
  computeHealthCheckupPackageCountV13,
  type HealthCheckupRecordV13,
} from "../aggregators/healthCheckupV13Aggregator.js";

const records: HealthCheckupRecordV13[] = [
  { checkupCount: 1000, packageCount: 10, followedAbnormalCount: 80, abnormalCount: 100 },
  { checkupCount: 1000, packageCount: 10, followedAbnormalCount: 80, abnormalCount: 100 },
];

export const healthCheckupV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-checkup",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-checkup:read");
      if (denied) return denied;
      return json(ok({
        healthCheckupCount: computeHealthCheckupCountV13(records),
        healthCheckupPackageCount: computeHealthCheckupPackageCountV13(records),
        healthCheckupAbnormalFollowupRate: computeHealthCheckupAbnormalFollowupRateV13(records),
      }));
    },
  },
];
