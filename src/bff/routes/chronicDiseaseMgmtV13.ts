/**
 * 健澜科技 jlmedaios - 慢病管理达标率 V13 路由（M316-B）
 *
 * GET /api/v1/chronic-disease-mgmt?disease=
 *
 * 权限：chronic-disease-mgmt:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDiabetesControlRateV13,
  computeHypertensionControlRateV13,
  groupByDoctorV13,
  type ChronicPatientV13,
} from "../aggregators/chronicDiseaseMgmtV13Aggregator.js";

const patients: ChronicPatientV13[] = [
  { patientId: "p1", doctorId: "D01", sbp: 130, dbp: 80, hba1c: 6.5 },
  { patientId: "p2", doctorId: "D01", sbp: 125, dbp: 75, hba1c: 6.8 },
  { patientId: "p3", doctorId: "D01", sbp: 135, dbp: 85, hba1c: 7.2 },
  { patientId: "p4", doctorId: "D01", sbp: 128, dbp: 78, hba1c: 6.9 },
  { patientId: "p5", doctorId: "D01", sbp: 150, dbp: 95, hba1c: 8.0 },
  { patientId: "p6", doctorId: "D02", sbp: 132, dbp: 82, hba1c: 6.6 },
  { patientId: "p7", doctorId: "D02", sbp: 128, dbp: 76, hba1c: 6.7 },
  { patientId: "p8", doctorId: "D02", sbp: 145, dbp: 92, hba1c: 7.5 },
  { patientId: "p9", doctorId: "D02", sbp: 155, dbp: 98, hba1c: 8.5 },
  { patientId: "p10", doctorId: "D02", sbp: 138, dbp: 88, hba1c: 7.0 },
];

export const chronicDiseaseMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/chronic-disease-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "chronic-disease-mgmt:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const disease = url.searchParams.get("disease") ?? "hypertension";
      return json(ok({
        disease,
        hypertensionRate: computeHypertensionControlRateV13(patients),
        diabetesRate: computeDiabetesControlRateV13(patients),
        doctorGroups: groupByDoctorV13(patients),
      }));
    },
  },
];
