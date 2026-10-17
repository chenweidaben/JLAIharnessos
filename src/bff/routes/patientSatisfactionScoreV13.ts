/**
 * 健澜科技 jlmedaios - 患者满意度（得分）V13 路由（M365-A，stats/score避让）
 *
 * GET /api/v1/patient-satisfaction-score
 *
 * 权限：patient-satisfaction-score:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientSatisfactionScoreV13,
  computeOutpatientSatisfactionScoreV13,
  computeOverallSatisfactionV13,
  type PatientSatisfactionScoreRecordV13,
} from "../aggregators/patientSatisfactionScoreV13Aggregator.js";

const records: PatientSatisfactionScoreRecordV13[] = [
  { overallSatisfaction: 95, outpatientSatisfaction: 96, inpatientSatisfaction: 94 },
  { overallSatisfaction: 97, outpatientSatisfaction: 98, inpatientSatisfaction: 96 },
];

export const patientSatisfactionScoreV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-satisfaction-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-satisfaction-score:read");
      if (denied) return denied;
      return json(ok({
        overallSatisfaction: computeOverallSatisfactionV13(records),
        outpatientSatisfaction: computeOutpatientSatisfactionScoreV13(records),
        inpatientSatisfaction: computeInpatientSatisfactionScoreV13(records),
      }));
    },
  },
];
