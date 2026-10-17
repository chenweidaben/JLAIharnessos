/**
 * 健澜科技 jlmedaios - 手卫生明细 V13 路由（M393-A，避让旧版 handHygieneV13）
 *
 * GET /api/v1/hand-hygiene-detail
 *
 * 权限：hand-hygiene-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHandHygieneComplianceRateV13,
  computeHandHygieneConsumableUsageV13,
  computeHandHygieneCorrectRateV13,
  type HandHygieneDetailRecordV13,
} from "../aggregators/handHygieneDetailV13Aggregator.js";

const records: HandHygieneDetailRecordV13[] = [
  { compliantCount: 950, shouldCount: 1000, correctCount: 900, executionCount: 1000, usageMlCount: 50000 },
  { compliantCount: 950, shouldCount: 1000, correctCount: 900, executionCount: 1000, usageMlCount: 50000 },
];

export const handHygieneDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hand-hygiene-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hand-hygiene-detail:read");
      if (denied) return denied;
      return json(ok({
        handHygieneComplianceRate: computeHandHygieneComplianceRateV13(records),
        handHygieneCorrectRate: computeHandHygieneCorrectRateV13(records),
        handHygieneConsumableUsage: computeHandHygieneConsumableUsageV13(records),
      }));
    },
  },
];
