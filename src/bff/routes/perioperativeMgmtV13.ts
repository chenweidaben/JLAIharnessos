/**
 * 健澜科技 jlmedaios - 围手术期 V13 路由（M391-C）
 *
 * GET /api/v1/perioperative-mgmt
 *
 * 权限：perioperative-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePostopFollowupCompletionRateV13,
  computePostopInfectionRateV13,
  computePreopEvaluationCompletionRateV13,
  type PerioperativeMgmtRecordV13,
} from "../aggregators/perioperativeMgmtV13Aggregator.js";

const records: PerioperativeMgmtRecordV13[] = [
  { completedCount: 980, shouldCount: 1000, followedUpCount: 950, shouldFollowUpCount: 1000, infectionCount: 5, surgeryTotalCount: 1000 },
  { completedCount: 980, shouldCount: 1000, followedUpCount: 950, shouldFollowUpCount: 1000, infectionCount: 5, surgeryTotalCount: 1000 },
];

export const perioperativeMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/perioperative-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "perioperative-mgmt:read");
      if (denied) return denied;
      return json(ok({
        preopEvaluationCompletionRate: computePreopEvaluationCompletionRateV13(records),
        postopFollowupCompletionRate: computePostopFollowupCompletionRateV13(records),
        postopInfectionRate: computePostopInfectionRateV13(records),
      }));
    },
  },
];
