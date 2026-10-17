/**
 * 健澜科技 jlmedaios - 双向转诊 V13 路由（M337-C）
 *
 * GET /api/v1/referral-stats
 *
 * 权限：referral-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCompletionRateV13,
  computeDownReferralCountV13,
  computeUpReferralCountV13,
  type ReferralRecordV13,
} from "../aggregators/referralV13Aggregator.js";

const records: ReferralRecordV13[] = [
  { upReferralCount: 50, downReferralCount: 40, completedCount: 90 },
  { upReferralCount: 30, downReferralCount: 20, completedCount: 36 },
];

export const referralV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/referral-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "referral-stats:read");
      if (denied) return denied;
      return json(ok({
        upReferralCount: computeUpReferralCountV13(records),
        downReferralCount: computeDownReferralCountV13(records),
        completionRate: computeCompletionRateV13(records),
      }));
    },
  },
];
