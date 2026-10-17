/**
 * 健澜科技 jlmedaios - 患者体验统计 V13 路由（M386-A，stats 避让）
 *
 * GET /api/v1/patient-experience-stats
 *
 * 权限：patient-experience-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeComplaintResolutionHoursV13,
  computeComplimentLetterCountV13,
  computeSatisfactionScoreV13,
  type PatientExperienceRecordV13,
} from "../aggregators/patientExperienceStatsV13Aggregator.js";

const records: PatientExperienceRecordV13[] = [
  { totalScore: 4500, surveyCount: 1000, totalHours: 240, complaintCount: 120, complimentCount: 10 },
  { totalScore: 4500, surveyCount: 1000, totalHours: 240, complaintCount: 120, complimentCount: 10 },
];

export const patientExperienceStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-experience-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-experience-stats:read");
      if (denied) return denied;
      return json(ok({
        satisfactionScore: computeSatisfactionScoreV13(records),
        complaintResolutionHours: computeComplaintResolutionHoursV13(records),
        complimentLetterCount: computeComplimentLetterCountV13(records),
      }));
    },
  },
];
