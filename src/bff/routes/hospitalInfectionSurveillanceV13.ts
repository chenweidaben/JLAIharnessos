/**
 * 健澜科技 jlmedaios - 院感监测管理 V13 路由（M441-A，医院感染管理组）
 *
 * GET /api/v1/hospital-infection-surveillance
 *
 * 权限：hospital-infection-surveillance:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHospitalInfectionMissReportRateV13,
  computeHospitalInfectionRateV13,
  computeHospitalInfectionTargetedMonitoringRateV13,
  type HospitalInfectionSurveillanceRecordV13,
} from "../aggregators/hospitalInfectionSurveillanceV13Aggregator.js";

const records: HospitalInfectionSurveillanceRecordV13[] = [
  { hospitalInfectionCount: 50, totalInpatient: 1000, missReportCount: 5, totalInfection: 1000, targetedMonitoringDept: 95, shouldMonitorDept: 100 },
  { hospitalInfectionCount: 50, totalInpatient: 1000, missReportCount: 5, totalInfection: 1000, targetedMonitoringDept: 95, shouldMonitorDept: 100 },
];

export const hospitalInfectionSurveillanceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospital-infection-surveillance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospital-infection-surveillance:read");
      if (denied) return denied;
      return json(ok({
        hospitalInfectionRate: computeHospitalInfectionRateV13(records),
        hospitalInfectionMissReportRate: computeHospitalInfectionMissReportRateV13(records),
        hospitalInfectionTargetedMonitoringRate: computeHospitalInfectionTargetedMonitoringRateV13(records),
      }));
    },
  },
];
