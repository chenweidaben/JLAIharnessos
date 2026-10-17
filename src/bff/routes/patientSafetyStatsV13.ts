/**
 * 健澜科技 jlmedaios - 患者安全目标 V13 路由（M357-A，stats 避让已有 patientSafetyV13 / M322-B）
 *
 * GET /api/v1/patient-safety-stats
 *
 * 权限：patient-safety-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdverseEventReportRateV13,
  computeNosocomialFallRateV13,
  computeNosocomialPressureUlcerRateV13,
  type PatientSafetyStatsRecordV13,
} from "../aggregators/patientSafetyStatsV13Aggregator.js";

const records: PatientSafetyStatsRecordV13[] = [
  { adverseEventReported: 5, dischargedPatients: 1000, pressureUlcerOccurred: 1, inpatientAdmissions: 2000, fallOccurred: 2 },
  { adverseEventReported: 5, dischargedPatients: 1000, pressureUlcerOccurred: 1, inpatientAdmissions: 2000, fallOccurred: 2 },
];

export const patientSafetyStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-safety-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-safety-stats:read");
      if (denied) return denied;
      return json(ok({
        adverseEventReportRate: computeAdverseEventReportRateV13(records),
        pressureUlcerRate: computeNosocomialPressureUlcerRateV13(records),
        fallRate: computeNosocomialFallRateV13(records),
      }));
    },
  },
];
