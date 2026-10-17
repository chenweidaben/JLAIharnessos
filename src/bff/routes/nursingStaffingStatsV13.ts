/**
 * 健澜科技 jlmedaios - 护理人力统计 V13 路由（M389-D，stats 避让，M389 收官）
 *
 * GET /api/v1/nursing-staffing-stats
 *
 * 权限：nursing-staffing-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedNurseRatioV13,
  computeNightShiftNurseRatioV13,
  computePatientNurseRatioV13,
  type NursingStaffingRecordV13,
} from "../aggregators/nursingStaffingStatsV13Aggregator.js";

const records: NursingStaffingRecordV13[] = [
  { bedCount: 100, nurseCount: 250, patientCount: 200, shiftNurseCount: 20, nightNurseCount: 10, dayNurseCount: 20 },
  { bedCount: 100, nurseCount: 250, patientCount: 200, shiftNurseCount: 20, nightNurseCount: 10, dayNurseCount: 20 },
];

export const nursingStaffingStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-staffing-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-staffing-stats:read");
      if (denied) return denied;
      return json(ok({
        bedNurseRatio: computeBedNurseRatioV13(records),
        patientNurseRatio: computePatientNurseRatioV13(records),
        nightShiftNurseRatio: computeNightShiftNurseRatioV13(records),
      }));
    },
  },
];
