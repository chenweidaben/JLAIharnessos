/**
 * 健澜科技 jlmedaios - 病例讨论 V13 路由（M404-C）
 *
 * GET /api/v1/case-discussion
 *
 * 权限：case-discussion:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeathCaseDiscussionRateV13,
  computeDifficultCaseDiscussionRateV13,
  computePreoperativeDiscussionCompletionRateV13,
  type CaseDiscussionRecordV13,
} from "../aggregators/caseDiscussionV13Aggregator.js";

const records: CaseDiscussionRecordV13[] = [
  { discussedDifficult: 95, totalDifficult: 100, discussedDeath: 100, totalDeath: 100, completedPreop: 980, totalPreop: 1000 },
  { discussedDifficult: 95, totalDifficult: 100, discussedDeath: 100, totalDeath: 100, completedPreop: 980, totalPreop: 1000 },
];

export const caseDiscussionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/case-discussion",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "case-discussion:read");
      if (denied) return denied;
      return json(ok({
        difficultCaseDiscussionRate: computeDifficultCaseDiscussionRateV13(records),
        deathCaseDiscussionRate: computeDeathCaseDiscussionRateV13(records),
        preoperativeDiscussionCompletionRate: computePreoperativeDiscussionCompletionRateV13(records),
      }));
    },
  },
];
