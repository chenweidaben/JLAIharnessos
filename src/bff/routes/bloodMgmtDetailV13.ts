/**
 * 健澜科技 jlmedaios - 输血管理 V13 路由（M392-D，M392 收官）
 *
 * GET /api/v1/blood-mgmt-detail
 *
 * 权限：blood-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePreTransfusionTestCompletionRateV13,
  computeTransfusionAdverseReactionRateV13,
  computeTransfusionApplicationRateV13,
  type BloodMgmtDetailRecordV13,
} from "../aggregators/bloodMgmtDetailV13Aggregator.js";

const records: BloodMgmtDetailRecordV13[] = [
  { applicationCount: 50, patientTotalCount: 1000, adverseCount: 2, transfusionCount: 1000, completedCount: 980, shouldCount: 1000 },
  { applicationCount: 50, patientTotalCount: 1000, adverseCount: 2, transfusionCount: 1000, completedCount: 980, shouldCount: 1000 },
];

export const bloodMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        transfusionApplicationRate: computeTransfusionApplicationRateV13(records),
        transfusionAdverseReactionRate: computeTransfusionAdverseReactionRateV13(records),
        preTransfusionTestCompletionRate: computePreTransfusionTestCompletionRateV13(records),
      }));
    },
  },
];
