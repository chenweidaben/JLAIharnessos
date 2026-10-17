/**
 * 健澜科技 jlmedaios - 院感监测（细节）V13 路由（M421-A，detail 避让旧版 infectionReportMgmtV13/infectionControlDetailV13 等院感系列）
 *
 * GET /api/v1/infection-surveillance-detail
 *
 * 权限：infection-surveillance-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEnvironmentalHygieneMonitoringPassRateV13,
  computeHospitalInfectionIncidenceRateV13,
  computeHospitalInfectionMissingReportRateV13,
  type InfectionSurveillanceDetailRecordV13,
} from "../aggregators/infectionSurveillanceDetailV13Aggregator.js";

const records: InfectionSurveillanceDetailRecordV13[] = [
  { infectionPatientCount: 20, dischargePatientTotal: 1000, missingReport: 2, shouldReport: 100, envSampleQualified: 980, envSampleTotal: 1000 },
  { infectionPatientCount: 20, dischargePatientTotal: 1000, missingReport: 2, shouldReport: 100, envSampleQualified: 980, envSampleTotal: 1000 },
];

export const infectionSurveillanceDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infection-surveillance-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infection-surveillance-detail:read");
      if (denied) return denied;
      return json(ok({
        hospitalInfectionIncidenceRate: computeHospitalInfectionIncidenceRateV13(records),
        hospitalInfectionMissingReportRate: computeHospitalInfectionMissingReportRateV13(records),
        environmentalHygieneMonitoringPassRate: computeEnvironmentalHygieneMonitoringPassRateV13(records),
      }));
    },
  },
];
