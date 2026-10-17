/**
 * 健澜科技 jlmedaios - 医疗质量核心制度 V13 路由（M357-B）
 *
 * GET /api/v1/core-system
 *
 * 权限：core-system:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeathCaseDiscussionRateV13,
  computeDifficultCaseDiscussionRateV13,
  computeThreeRoundRateV13,
  type CoreSystemRecordV13,
} from "../aggregators/coreSystemV13Aggregator.js";

const records: CoreSystemRecordV13[] = [
  { threeRoundImplemented: 95, threeRoundRequired: 100, difficultCaseDiscussed: 48, difficultCaseCount: 50, deathCaseDiscussed: 30, deathCaseCount: 30 },
  { threeRoundImplemented: 95, threeRoundRequired: 100, difficultCaseDiscussed: 47, difficultCaseCount: 50, deathCaseDiscussed: 25, deathCaseCount: 25 },
];

export const coreSystemV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/core-system",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "core-system:read");
      if (denied) return denied;
      return json(ok({
        threeRoundRate: computeThreeRoundRateV13(records),
        difficultCaseDiscussionRate: computeDifficultCaseDiscussionRateV13(records),
        deathCaseDiscussionRate: computeDeathCaseDiscussionRateV13(records),
      }));
    },
  },
];
