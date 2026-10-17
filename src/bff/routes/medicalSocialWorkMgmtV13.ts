/**
 * 健澜科技 jlmedaios - 医务社工管理 V13 路由（M420-D，M420 收官）
 *
 * GET /api/v1/medical-social-work-mgmt
 *
 * 权限：medical-social-work-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDoctorPatientCommunicationCoordinationRateV13,
  computeHardshipPatientAidRateV13,
  computeSocialWorkServiceVisitsV13,
  type MedicalSocialWorkMgmtRecordV13,
} from "../aggregators/medicalSocialWorkMgmtV13Aggregator.js";

const records: MedicalSocialWorkMgmtRecordV13[] = [
  { serviceVisits: 300, hardshipAided: 950, hardshipTotal: 1000, coordinationSuccess: 980, coordinationTotal: 1000 },
  { serviceVisits: 500, hardshipAided: 950, hardshipTotal: 1000, coordinationSuccess: 980, coordinationTotal: 1000 },
];

export const medicalSocialWorkMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-social-work-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-social-work-mgmt:read");
      if (denied) return denied;
      return json(ok({
        socialWorkServiceVisits: computeSocialWorkServiceVisitsV13(records),
        hardshipPatientAidRate: computeHardshipPatientAidRateV13(records),
        doctorPatientCommunicationCoordinationRate: computeDoctorPatientCommunicationCoordinationRateV13(records),
      }));
    },
  },
];
