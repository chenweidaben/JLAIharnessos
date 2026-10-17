/**
 * 健澜科技 jlmedaios - 健康档案 V13 路由（M367-D，M367 收官）
 *
 * GET /api/v1/health-record
 *
 * 权限：health-record:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHealthRecordFilingRateV13,
  computeHealthRecordUpdateRateV13,
  computeHealthRecordUsageRateV13,
  type HealthRecordRecordV13,
} from "../aggregators/healthRecordV13Aggregator.js";

const records: HealthRecordRecordV13[] = [
  { shouldFileCount: 1000, filedCount: 800, totalRecords: 800, usedRecords: 600, updatedRecords: 700 },
  { shouldFileCount: 1000, filedCount: 800, totalRecords: 800, usedRecords: 600, updatedRecords: 700 },
];

export const healthRecordV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-record:read");
      if (denied) return denied;
      return json(ok({
        healthRecordFilingRate: computeHealthRecordFilingRateV13(records),
        healthRecordUsageRate: computeHealthRecordUsageRateV13(records),
        healthRecordUpdateRate: computeHealthRecordUpdateRateV13(records),
      }));
    },
  },
];
