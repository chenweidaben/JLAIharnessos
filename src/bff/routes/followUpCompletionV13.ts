/**
 * 健澜科技 jlmedaios - 出院随访率 V13 路由（M347-C）
 *
 * GET /api/v1/follow-up-completion
 *
 * 权限：follow-up-completion:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeActualFollowUpV13,
  computeFollowUpRateV13,
  computeShouldFollowUpV13,
  type FollowUpRecordV13,
} from "../aggregators/followUpCompletionV13Aggregator.js";

const records: FollowUpRecordV13[] = [
  { shouldFollowUp: 50, actualFollowUp: 45 },
  { shouldFollowUp: 50, actualFollowUp: 50 },
];

export const followUpCompletionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/follow-up-completion",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "follow-up-completion:read");
      if (denied) return denied;
      return json(ok({
        shouldFollowUp: computeShouldFollowUpV13(records),
        actualFollowUp: computeActualFollowUpV13(records),
        followUpRate: computeFollowUpRateV13(records),
      }));
    },
  },
];
