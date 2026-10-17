/**
 * 健澜科技 jlmedaios - 患者流量 V13 路由（M364-C）
 *
 * GET /api/v1/patient-flow
 *
 * 权限：patient-flow:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDischargedPatientsV13,
  computeOutpatientEmergencyVisitsV13,
  computeSurgeryCountV13,
  type PatientFlowRecordV13,
} from "../aggregators/patientFlowV13Aggregator.js";

const records: PatientFlowRecordV13[] = [
  { outpatientEmergencyVisits: 5000, dischargedPatients: 950, surgeryCount: 300 },
  { outpatientEmergencyVisits: 5000, dischargedPatients: 950, surgeryCount: 300 },
];

export const patientFlowV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-flow",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-flow:read");
      if (denied) return denied;
      return json(ok({
        outpatientEmergencyVisits: computeOutpatientEmergencyVisitsV13(records),
        dischargedPatients: computeDischargedPatientsV13(records),
        surgeryCount: computeSurgeryCountV13(records),
      }));
    },
  },
];
