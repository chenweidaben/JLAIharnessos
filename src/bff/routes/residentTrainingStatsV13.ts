/**
 * 健澜科技 jlmedaios - 住培管理统计 V13 路由（M383-C，stats 避让）
 *
 * GET /api/v1/resident-training-stats
 *
 * 权限：resident-training-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeGraduationExamPassRateV13,
  computeResidentInTrainingCountV13,
  computeResidentSatisfactionRateV13,
  type ResidentTrainingRecordV13,
} from "../aggregators/residentTrainingStatsV13Aggregator.js";

const records: ResidentTrainingRecordV13[] = [
  { residentCount: 100, passCount: 950, examCount: 1000, satisfactionCount: 900, surveyCount: 1000 },
  { residentCount: 100, passCount: 950, examCount: 1000, satisfactionCount: 900, surveyCount: 1000 },
];

export const residentTrainingStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/resident-training-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "resident-training-stats:read");
      if (denied) return denied;
      return json(ok({
        residentInTrainingCount: computeResidentInTrainingCountV13(records),
        graduationExamPassRate: computeGraduationExamPassRateV13(records),
        residentSatisfactionRate: computeResidentSatisfactionRateV13(records),
      }));
    },
  },
];
