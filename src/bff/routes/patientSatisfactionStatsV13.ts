/**
 * 健澜科技 jlmedaios - 患者满意度 V13 路由（M347-A，stats 避让已有 patientSatisfactionV13）
 *
 * GET /api/v1/patient-satisfaction-stats
 *
 * 权限：patient-satisfaction-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientSatisfactionV13,
  computeOutpatientSatisfactionV13,
  type PatientSatisfactionRecordV13,
} from "../aggregators/patientSatisfactionStatsV13Aggregator.js";

const records: PatientSatisfactionRecordV13[] = [
  { outpatientScore: 4.5, inpatientScore: 4.4 },
  { outpatientScore: 4.6, inpatientScore: 4.5 },
  { outpatientScore: 4.7, inpatientScore: 4.6 },
];

export const patientSatisfactionStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-satisfaction-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-satisfaction-stats:read");
      if (denied) return denied;
      return json(ok({
        outpatient: computeOutpatientSatisfactionV13(records),
        inpatient: computeInpatientSatisfactionV13(records),
      }));
    },
  },
];
