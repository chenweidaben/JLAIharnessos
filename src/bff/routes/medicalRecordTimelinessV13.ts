/**
 * 健澜科技 jlmedaios - 病历书写及时性 V13 路由（M318-A）
 *
 * GET /api/v1/medical-record-timeliness?dept=
 *
 * 权限：medical-record-timeliness:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdmissionRecordRateV13,
  computeFirstProgressRateV13,
  flagOverdueRecordsV13,
  type MedicalRecordV13,
} from "../aggregators/medicalRecordTimelinessV13Aggregator.js";

const records: MedicalRecordV13[] = [
  { recordId: "r1", doctorId: "D01", admissionRecordHours: 12, firstProgressHours: 4 },
  { recordId: "r2", doctorId: "D01", admissionRecordHours: 18, firstProgressHours: 6 },
  { recordId: "r3", doctorId: "D02", admissionRecordHours: 20, firstProgressHours: 5 },
  { recordId: "r4", doctorId: "D02", admissionRecordHours: 22, firstProgressHours: 7 },
  { recordId: "r5", doctorId: "D03", admissionRecordHours: 23, firstProgressHours: 8 },
  { recordId: "r6", doctorId: "D03", admissionRecordHours: 24, firstProgressHours: 8 },
  { recordId: "r7", doctorId: "D04", admissionRecordHours: 25, firstProgressHours: 9 },
  { recordId: "r8", doctorId: "D04", admissionRecordHours: 30, firstProgressHours: 10 },
  { recordId: "r9", doctorId: "D05", admissionRecordHours: 15, firstProgressHours: 5 },
  { recordId: "r10", doctorId: "D05", admissionRecordHours: 16, firstProgressHours: 6 },
];

export const medicalRecordTimelinessV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-timeliness",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-timeliness:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      return json(ok({
        dept,
        admissionRate: computeAdmissionRecordRateV13(records),
        firstProgressRate: computeFirstProgressRateV13(records),
        overdueRecords: flagOverdueRecordsV13(records),
      }));
    },
  },
];
