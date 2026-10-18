/**
 * 健澜科技 jlmedaios - 日间手术管理 V13 路由（M458-A，日间手术与门诊操作管理组）
 *
 * GET /api/v1/day-surgery-mgmt
 *
 * 权限：day-surgery-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDaySurgeryDischargeFollowupRateV13,
  computeDaySurgeryProportionRateV13,
  computeDaySurgeryUnplannedReadmissionRateV13,
  type DaySurgeryMgmtRecordV13,
} from "../aggregators/daySurgeryMgmtV13Aggregator.js";

const records: DaySurgeryMgmtRecordV13[] = [
  { day: 950, totalElective: 1000, followedUp: 900, totalDischarged: 1000, readmission: 98 },
  { day: 950, totalElective: 1000, followedUp: 900, totalDischarged: 1000, readmission: 98 },
];

export const daySurgeryMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/day-surgery-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "day-surgery-mgmt:read");
      if (denied) return denied;
      return json(ok({
        daySurgeryProportionRate: computeDaySurgeryProportionRateV13(records),
        daySurgeryDischargeFollowupRate: computeDaySurgeryDischargeFollowupRateV13(records),
        daySurgeryUnplannedReadmissionRate: computeDaySurgeryUnplannedReadmissionRateV13(records),
      }));
    },
  },
];
