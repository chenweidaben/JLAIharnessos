/**
 * 健澜科技 jlmedaios - 护理人员配置 V13 路由（M369-C）
 *
 * GET /api/v1/nursing-staff
 *
 * 权限：nursing-staff:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedNurseRatioV13,
  computeCollegeAboveNurseRatioV13,
  computeNurseTotalCountV13,
  type NursingStaffRecordV13,
} from "../aggregators/nursingStaffV13Aggregator.js";

const records: NursingStaffRecordV13[] = [
  { bedCount: 500, nurseCount: 200, collegeAboveCount: 160 },
  { bedCount: 500, nurseCount: 200, collegeAboveCount: 160 },
];

export const nursingStaffV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-staff",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-staff:read");
      if (denied) return denied;
      return json(ok({
        bedNurseRatio: computeBedNurseRatioV13(records),
        nurseTotalCount: computeNurseTotalCountV13(records),
        collegeAboveNurseRatio: computeCollegeAboveNurseRatioV13(records),
      }));
    },
  },
];
