/**
 * 健澜科技 jlmedaios - 人员管理 V13 路由（M362-A）
 *
 * GET /api/v1/staff-mgmt
 *
 * 权限：staff-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedWorkerRatioV13,
  computeDoctorNurseRatioV13,
  computeHealthTechRatioV13,
  type StaffMgmtRecordV13,
} from "../aggregators/staffMgmtV13Aggregator.js";

const records: StaffMgmtRecordV13[] = [
  { healthTech: 700, totalStaff: 1000, nurseCount: 600, doctorCount: 300, workerCount: 50, bedCount: 1000 },
  { healthTech: 700, totalStaff: 1000, nurseCount: 600, doctorCount: 300, workerCount: 50, bedCount: 1000 },
];

export const staffMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-mgmt:read");
      if (denied) return denied;
      return json(ok({
        healthTechRatio: computeHealthTechRatioV13(records),
        doctorNurseRatio: computeDoctorNurseRatioV13(records),
        bedWorkerRatio: computeBedWorkerRatioV13(records),
      }));
    },
  },
];
