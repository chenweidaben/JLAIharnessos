/**
 * 健澜科技 jlmedaios - 护理人力配置管理 V13 路由（M453-B，护理管理组）
 *
 * GET /api/v1/nursing-staffing-mgmt
 *
 * 权限：nursing-staffing-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingStaffingBedRatioComplianceRateV13,
  computeNursingStaffingQualificationRateV13,
  computeNursingStaffingSchedulingComplianceRateV13,
  type NursingStaffingMgmtRecordV13,
} from "../aggregators/nursingStaffingMgmtV13Aggregator.js";

const records: NursingStaffingMgmtRecordV13[] = [
  { compliantDept: 950, totalDept: 1000, qualifiedNurse: 900, totalNurse: 1000, compliantSchedule: 980, totalSchedule: 1000 },
  { compliantDept: 950, totalDept: 1000, qualifiedNurse: 900, totalNurse: 1000, compliantSchedule: 980, totalSchedule: 1000 },
];

export const nursingStaffingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-staffing-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-staffing-mgmt:read");
      if (denied) return denied;
      return json(ok({
        nursingStaffingBedRatioComplianceRate: computeNursingStaffingBedRatioComplianceRateV13(records),
        nursingStaffingQualificationRate: computeNursingStaffingQualificationRateV13(records),
        nursingStaffingSchedulingComplianceRate: computeNursingStaffingSchedulingComplianceRateV13(records),
      }));
    },
  },
];
