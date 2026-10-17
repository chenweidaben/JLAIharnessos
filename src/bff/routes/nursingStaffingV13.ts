/**
 * 健澜科技 jlmedaios - 护理人力配置 V13 路由（M358-C）
 *
 * GET /api/v1/nursing-staffing
 *
 * 权限：nursing-staffing:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedNurseRatioV13,
  computeIcuNursePatientRatioV13,
  computeWardNursePatientRatioV13,
  type NursingStaffingRecordV13,
} from "../aggregators/nursingStaffingV13Aggregator.js";

const records: NursingStaffingRecordV13[] = [
  { beds: 100, nurses: 200, wardNurses: 150, wardBeds: 100, icuNurses: 50, icuBeds: 20 },
  { beds: 100, nurses: 200, wardNurses: 150, wardBeds: 100, icuNurses: 50, icuBeds: 20 },
];

export const nursingStaffingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-staffing",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-staffing:read");
      if (denied) return denied;
      return json(ok({
        bedNurseRatio: computeBedNurseRatioV13(records),
        wardNursePatientRatio: computeWardNursePatientRatioV13(records),
        icuNursePatientRatio: computeIcuNursePatientRatioV13(records),
      }));
    },
  },
];
