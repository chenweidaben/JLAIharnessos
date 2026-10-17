/**
 * 健澜科技 jlmedaios - 抢救管理 V13 路由（M415-A）
 *
 * GET /api/v1/rescue-mgmt
 *
 * 权限：rescue-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRescueEquipmentIntegrityRateV13,
  computeRescueRecordCompletenessRateV13,
  computeRescueSuccessAssessmentRateV13,
  type RescueMgmtRecordV13,
} from "../aggregators/rescueMgmtV13Aggregator.js";

const records: RescueMgmtRecordV13[] = [
  { complete: 980, recordTotal: 1000, assessedSuccess: 750, rescueTotal: 1000, intact: 990, equipmentTotal: 1000 },
  { complete: 980, recordTotal: 1000, assessedSuccess: 750, rescueTotal: 1000, intact: 990, equipmentTotal: 1000 },
];

export const rescueMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rescue-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rescue-mgmt:read");
      if (denied) return denied;
      return json(ok({
        rescueRecordCompletenessRate: computeRescueRecordCompletenessRateV13(records),
        rescueSuccessAssessmentRate: computeRescueSuccessAssessmentRateV13(records),
        rescueEquipmentIntegrityRate: computeRescueEquipmentIntegrityRateV13(records),
      }));
    },
  },
];
