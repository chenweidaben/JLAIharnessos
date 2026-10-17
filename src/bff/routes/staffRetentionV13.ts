/**
 * 健澜科技 jlmedaios - 人员留存 V13 路由（M384-B）
 *
 * GET /api/v1/staff-retention
 *
 * 权限：staff-retention:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeKeyStaffRetentionRateV13,
  computeMedicalStaffTurnoverRateV13,
  computeStaffSatisfactionRateV13,
  type StaffRetentionRecordV13,
} from "../aggregators/staffRetentionV13Aggregator.js";

const records: StaffRetentionRecordV13[] = [
  { turnoverCount: 50, totalStaff: 1000, retainedKeyStaff: 190, keyStaff: 200, satisfactionCount: 850, surveyCount: 1000 },
  { turnoverCount: 50, totalStaff: 1000, retainedKeyStaff: 190, keyStaff: 200, satisfactionCount: 850, surveyCount: 1000 },
];

export const staffRetentionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-retention",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-retention:read");
      if (denied) return denied;
      return json(ok({
        medicalStaffTurnoverRate: computeMedicalStaffTurnoverRateV13(records),
        keyStaffRetentionRate: computeKeyStaffRetentionRateV13(records),
        staffSatisfactionRate: computeStaffSatisfactionRateV13(records),
      }));
    },
  },
];
