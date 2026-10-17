/**
 * 健澜科技 jlmedaios - 急诊分诊 V13 路由（M335-A）
 *
 * GET /api/v1/emergency-triage-stats
 *
 * 权限：emergency-triage-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIIPlusWaitTimeV13,
  computeTriageDistributionV13,
  type TriageRecordV13,
} from "../aggregators/emergencyTriageV13Aggregator.js";

const records: TriageRecordV13[] = [
  { triageLevel: "I", waitMinutes: 5 },
  { triageLevel: "II", waitMinutes: 3 },
  { triageLevel: "II", waitMinutes: 7 },
  { triageLevel: "III", waitMinutes: 15 },
  { triageLevel: "IV", waitMinutes: 30 },
];

export const emergencyTriageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-triage-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-triage-stats:read");
      if (denied) return denied;
      return json(ok({
        distribution: computeTriageDistributionV13(records),
        iiPlusWaitMinutes: computeIIPlusWaitTimeV13(records),
      }));
    },
  },
];
