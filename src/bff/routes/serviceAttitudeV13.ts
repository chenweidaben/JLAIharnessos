/**
 * 健澜科技 jlmedaios - 服务态度 V13 路由（M365-C）
 *
 * GET /api/v1/service-attitude
 *
 * 权限：service-attitude:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDoctorPatientCommunicationScoreV13,
  computeMedicalEthicsScoreV13,
  computeServiceAttitudeScoreV13,
  type ServiceAttitudeRecordV13,
} from "../aggregators/serviceAttitudeV13Aggregator.js";

const records: ServiceAttitudeRecordV13[] = [
  { medicalEthicsScore: 95, serviceAttitudeScore: 94, doctorPatientCommunicationScore: 93 },
  { medicalEthicsScore: 97, serviceAttitudeScore: 96, doctorPatientCommunicationScore: 95 },
];

export const serviceAttitudeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/service-attitude",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "service-attitude:read");
      if (denied) return denied;
      return json(ok({
        medicalEthicsScore: computeMedicalEthicsScoreV13(records),
        serviceAttitudeScore: computeServiceAttitudeScoreV13(records),
        doctorPatientCommunicationScore: computeDoctorPatientCommunicationScoreV13(records),
      }));
    },
  },
];
