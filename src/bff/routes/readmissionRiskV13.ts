/**
 * 健澜科技 jlmedaios - 31 天再入院风险预测 V13 路由（M314-B）
 *
 * GET /api/v1/readmission-risk
 *
 * 权限：readmission-risk:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyReadmissionRiskV13,
  computeReadmissionRiskScoreV13,
  identifyHighRiskPatientsV13,
  type ReadmissionPatientV13,
} from "../aggregators/readmissionRiskV13Aggregator.js";

const patients: ReadmissionPatientV13[] = [
  { patientId: "p1", age: 65, comorbidityCount: 3, losDays: 5 },
  { patientId: "p2", age: 40, comorbidityCount: 1, losDays: 3 },
];

export const readmissionRiskV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/readmission-risk",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "readmission-risk:read");
      if (denied) return denied;
      return json(ok({
        board: patients.map((p) => {
          const score = computeReadmissionRiskScoreV13(p);
          return {
            patientId: p.patientId,
            score,
            level: classifyReadmissionRiskV13(score),
          };
        }),
        highRisk: identifyHighRiskPatientsV13(patients).map((p) => p.patientId),
      }));
    },
  },
];
