/**
 * 健澜科技 jlmedaios - 核心制度落实 V13 路由（M387-A）
 *
 * GET /api/v1/core-system-compliance
 *
 * 权限：core-system-compliance:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDifficultCaseDiscussionRateV13,
  computeFirstVisitResponsibilityRateV13,
  computeThreeLevelRoundRateV13,
  type CoreSystemComplianceRecordV13,
} from "../aggregators/coreSystemComplianceV13Aggregator.js";

const records: CoreSystemComplianceRecordV13[] = [
  { firstVisitImplemented: 980, firstVisitShould: 1000, roundImplemented: 950, roundShould: 1000, discussed: 900, shouldDiscuss: 1000 },
  { firstVisitImplemented: 980, firstVisitShould: 1000, roundImplemented: 950, roundShould: 1000, discussed: 900, shouldDiscuss: 1000 },
];

export const coreSystemComplianceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/core-system-compliance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "core-system-compliance:read");
      if (denied) return denied;
      return json(ok({
        firstVisitResponsibilityRate: computeFirstVisitResponsibilityRateV13(records),
        threeLevelRoundRate: computeThreeLevelRoundRateV13(records),
        difficultCaseDiscussionRate: computeDifficultCaseDiscussionRateV13(records),
      }));
    },
  },
];
