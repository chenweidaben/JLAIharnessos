/**
 * 健澜科技 jlmedaios - 排班管理 V13 路由（M402-A）
 *
 * GET /api/v1/scheduling-mgmt
 *
 * 权限：scheduling-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNurseSchedulingComplianceRateV13,
  computePhysicianOnDutyCoverageRateV13,
  computeSchedulingAccuracyRateV13,
  type SchedulingMgmtRecordV13,
} from "../aggregators/schedulingMgmtV13Aggregator.js";

const records: SchedulingMgmtRecordV13[] = [
  { accurateScheduling: 980, totalScheduling: 1000, compliantNurse: 950, totalNurse: 1000, actualOnDuty: 90, requiredOnDuty: 100 },
  { accurateScheduling: 980, totalScheduling: 1000, compliantNurse: 950, totalNurse: 1000, actualOnDuty: 90, requiredOnDuty: 100 },
];

export const schedulingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/scheduling-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "scheduling-mgmt:read");
      if (denied) return denied;
      return json(ok({
        schedulingAccuracyRate: computeSchedulingAccuracyRateV13(records),
        nurseSchedulingComplianceRate: computeNurseSchedulingComplianceRateV13(records),
        physicianOnDutyCoverageRate: computePhysicianOnDutyCoverageRateV13(records),
      }));
    },
  },
];
