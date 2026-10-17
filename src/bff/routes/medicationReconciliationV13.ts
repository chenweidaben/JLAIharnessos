/**
 * 健澜科技 jlmedaios - 出院用药重整 V13 路由（M314-C）
 *
 * GET /api/v1/medication-reconciliation?patientId=
 *
 * 权限：medication-reconciliation:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compareMedicationListV13,
  detectDuplicateMedsV13,
  detectMissingMedsV13,
  type MedicationV13,
} from "../aggregators/medicationReconciliationV13Aggregator.js";

const admissionMeds: MedicationV13[] = [
  { genericName: "aspirin", dosage: "100mg" },
  { genericName: "metformin", dosage: "500mg" },
  { genericName: "lisinopril", dosage: "10mg" },
];

const dischargeMeds: MedicationV13[] = [
  { genericName: "aspirin", dosage: "100mg" },
  { genericName: "metformin", dosage: "500mg" },
  { genericName: "amlodipine", dosage: "5mg" },
];

export const medicationReconciliationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medication-reconciliation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medication-reconciliation:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const patientId = url.searchParams.get("patientId") ?? "p1";
      const diff = compareMedicationListV13(admissionMeds, dischargeMeds);
      return json(ok({
        patientId,
        diff,
        missing: detectMissingMedsV13(admissionMeds, dischargeMeds),
        duplicates: detectDuplicateMedsV13(dischargeMeds),
      }));
    },
  },
];
