/**
 * 健澜科技 jlmedaios - 患者体验 V13 路由（M358-B）
 *
 * GET /api/v1/patient-experience
 *
 * 权限：patient-experience:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDischargeFollowUpRateV13,
  computeInpatientSatisfactionV13,
  computeOutpatientSatisfactionV13,
  type PatientExperienceRecordV13,
} from "../aggregators/patientExperienceV13Aggregator.js";

const records: PatientExperienceRecordV13[] = [
  { outpatientSatisfaction: 95, inpatientSatisfaction: 94, dischargeFollowedUp: 480, dischargeCount: 500 },
  { outpatientSatisfaction: 97, inpatientSatisfaction: 96, dischargeFollowedUp: 470, dischargeCount: 500 },
];

export const patientExperienceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-experience",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-experience:read");
      if (denied) return denied;
      return json(ok({
        outpatientSatisfaction: computeOutpatientSatisfactionV13(records),
        inpatientSatisfaction: computeInpatientSatisfactionV13(records),
        dischargeFollowUpRate: computeDischargeFollowUpRateV13(records),
      }));
    },
  },
];
