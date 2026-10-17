/**
 * 健澜科技 jlmedaios - 护理管理 V13 路由（M376-D，M376 收官）
 *
 * GET /api/v1/nursing-management
 *
 * 权限：nursing-management:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedNurseRatioV13,
  computeNursingTrainingCompletionRateV13,
  computeNursingUnitCountV13,
  type NursingManagementRecordV13,
} from "../aggregators/nursingManagementV13Aggregator.js";

const records: NursingManagementRecordV13[] = [
  { nursingUnitCount: 10, bedCount: 500, nurseCount: 200, shouldTrainCount: 100, trainCompleteCount: 95 },
  { nursingUnitCount: 10, bedCount: 500, nurseCount: 200, shouldTrainCount: 100, trainCompleteCount: 95 },
];

export const nursingManagementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-management",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-management:read");
      if (denied) return denied;
      return json(ok({
        nursingUnitCount: computeNursingUnitCountV13(records),
        bedNurseRatio: computeBedNurseRatioV13(records),
        nursingTrainingCompletionRate: computeNursingTrainingCompletionRateV13(records),
      }));
    },
  },
];
