/**
 * 健澜科技 jlmedaios - 处方点评合格率 V13 路由（M318-B）
 *
 * GET /api/v1/prescription-audit?dept=
 *
 * 权限：prescription-audit:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyIrrationalTypesV13,
  computeDoctorPassRateV13,
  computePrescriptionPassRateV13,
  type PrescriptionV13,
} from "../aggregators/prescriptionAuditV13Aggregator.js";

const prescriptions: PrescriptionV13[] = [
  { prescriptionId: "p1", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p2", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p3", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p4", dept: "cardio", doctorId: "D01", isPass: true, irrationalType: null },
  { prescriptionId: "p5", dept: "cardio", doctorId: "D01", isPass: false, irrationalType: "indication" },
  { prescriptionId: "p6", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p7", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p8", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p9", dept: "cardio", doctorId: "D02", isPass: true, irrationalType: null },
  { prescriptionId: "p10", dept: "cardio", doctorId: "D02", isPass: false, irrationalType: "dosage" },
  { prescriptionId: "p11", dept: "cardio", doctorId: "D03", isPass: false, irrationalType: "duplicate" },
  { prescriptionId: "p12", dept: "cardio", doctorId: "D03", isPass: false, irrationalType: "interaction" },
];

export const prescriptionAuditV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/prescription-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "prescription-audit:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      return json(ok({
        dept,
        deptPassRate: computePrescriptionPassRateV13(prescriptions, dept),
        irrationalClassification: classifyIrrationalTypesV13(prescriptions),
        doctorPassRates: [
          { doctorId: "D01", passRate: computeDoctorPassRateV13(prescriptions, "D01") },
          { doctorId: "D02", passRate: computeDoctorPassRateV13(prescriptions, "D02") },
          { doctorId: "D03", passRate: computeDoctorPassRateV13(prescriptions, "D03") },
        ],
      }));
    },
  },
];
