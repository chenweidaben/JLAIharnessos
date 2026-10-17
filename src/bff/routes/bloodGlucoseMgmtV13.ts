/**
 * 健澜科技 jlmedaios - 血糖管理 V13 路由（M424-D，M424 收官）
 *
 * GET /api/v1/blood-glucose-mgmt
 *
 * 权限：blood-glucose-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBloodGlucoseMonitoringComplianceRateV13,
  computeBloodGlucoseTargetAchieveRateV13,
  computeHypoglycemiaOccurrenceRateV13,
  type BloodGlucoseMgmtRecordV13,
} from "../aggregators/bloodGlucoseMgmtV13Aggregator.js";

const records: BloodGlucoseMgmtRecordV13[] = [
  { compliantMon: 980, shouldMon: 1000, targetAchieved: 900, monitoredPatients: 1000, hypoOccurred: 5, totalMon: 10000 },
  { compliantMon: 980, shouldMon: 1000, targetAchieved: 900, monitoredPatients: 1000, hypoOccurred: 5, totalMon: 10000 },
];

export const bloodGlucoseMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-glucose-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-glucose-mgmt:read");
      if (denied) return denied;
      return json(ok({
        bloodGlucoseMonitoringComplianceRate: computeBloodGlucoseMonitoringComplianceRateV13(records),
        bloodGlucoseTargetAchieveRate: computeBloodGlucoseTargetAchieveRateV13(records),
        hypoglycemiaOccurrenceRate: computeHypoglycemiaOccurrenceRateV13(records),
      }));
    },
  },
];
