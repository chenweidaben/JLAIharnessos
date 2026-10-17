/**
 * 健澜科技 jlmedaios - 护患沟通 V13 路由（M405-B）
 *
 * GET /api/v1/nursing-communication
 *
 * 权限：nursing-communication:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDischargeGuidelineAwarenessRateV13,
  computeHealthEducationCoverageRateV13,
  computeNursePatientCommunicationSatisfactionRateV13,
  type NursingCommunicationRecordV13,
} from "../aggregators/nursingCommunicationV13Aggregator.js";

const records: NursingCommunicationRecordV13[] = [
  { satisfied: 950, totalSurvey: 1000, covered: 980, shouldCover: 1000, aware: 900, totalAwareness: 1000 },
  { satisfied: 950, totalSurvey: 1000, covered: 980, shouldCover: 1000, aware: 900, totalAwareness: 1000 },
];

export const nursingCommunicationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-communication",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-communication:read");
      if (denied) return denied;
      return json(ok({
        nursePatientCommunicationSatisfactionRate: computeNursePatientCommunicationSatisfactionRateV13(records),
        healthEducationCoverageRate: computeHealthEducationCoverageRateV13(records),
        dischargeGuidelineAwarenessRate: computeDischargeGuidelineAwarenessRateV13(records),
      }));
    },
  },
];
