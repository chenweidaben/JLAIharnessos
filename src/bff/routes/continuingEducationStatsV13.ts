/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 路由（M354-D，M354 收官）
 *
 * GET /api/v1/continuing-education-stats
 *
 * 权限：continuing-education-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnnualTrainingCountV13,
  computeCreditComplianceRateV13,
  computeThreeBaseExamPassRateV13,
  type ContinuingEducationStatsRecordV13,
} from "../aggregators/continuingEducationStatsV13Aggregator.js";

const records: ContinuingEducationStatsRecordV13[] = [
  { creditCompliantCount: 90, creditDueCount: 100, annualTrainingCount: 500, threeBasePassCount: 95, threeBaseTookCount: 100 },
  { creditCompliantCount: 90, creditDueCount: 100, annualTrainingCount: 500, threeBasePassCount: 95, threeBaseTookCount: 100 },
];

export const continuingEducationStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/continuing-education-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "continuing-education-stats:read");
      if (denied) return denied;
      return json(ok({
        creditComplianceRate: computeCreditComplianceRateV13(records),
        annualTrainingCount: computeAnnualTrainingCountV13(records),
        threeBaseExamPassRate: computeThreeBaseExamPassRateV13(records),
      }));
    },
  },
];
