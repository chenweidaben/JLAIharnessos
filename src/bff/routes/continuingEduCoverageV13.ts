/**
 * 健澜科技 jlmedaios - 继续教育（覆盖率）V13 路由（M361-C）
 *
 * GET /api/v1/continuing-edu-coverage
 *
 * 权限：continuing-edu-coverage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeContinuingEduCoverageRateV13,
  computeContinuingEduHoursCompletionRateV13,
  computeContinuingEduProjectPassRateV13,
  type ContinuingEduCoverageRecordV13,
} from "../aggregators/continuingEduCoverageV13Aggregator.js";

const records: ContinuingEduCoverageRecordV13[] = [
  { completedHours: 950, requiredHours: 1000, passedProjects: 48, attendedProjects: 50, coveredPersons: 480, requiredPersons: 500 },
  { completedHours: 950, requiredHours: 1000, passedProjects: 47, attendedProjects: 50, coveredPersons: 470, requiredPersons: 500 },
];

export const continuingEduCoverageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/continuing-edu-coverage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "continuing-edu-coverage:read");
      if (denied) return denied;
      return json(ok({
        hoursCompletionRate: computeContinuingEduHoursCompletionRateV13(records),
        projectPassRate: computeContinuingEduProjectPassRateV13(records),
        coverageRate: computeContinuingEduCoverageRateV13(records),
      }));
    },
  },
];
