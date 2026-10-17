/**
 * 健澜科技 jlmedaios - 病案管理 V13 路由（M401-A）
 *
 * GET /api/v1/medical-record
 *
 * 权限：medical-record:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalRecordArchivingTimelyRateV13,
  computeMedicalRecordFrontPagePassRateV13,
  computeMedicalRecordGradeARateV13,
  type MedicalRecordRecordV13,
} from "../aggregators/medicalRecordV13Aggregator.js";

const records: MedicalRecordRecordV13[] = [
  { timelyArchived: 900, totalArchived: 1000, gradeA: 850, totalRecords: 1000, passed: 950, totalChecked: 1000 },
  { timelyArchived: 900, totalArchived: 1000, gradeA: 850, totalRecords: 1000, passed: 950, totalChecked: 1000 },
];

export const medicalRecordV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record:read");
      if (denied) return denied;
      return json(ok({
        medicalRecordArchivingTimelyRate: computeMedicalRecordArchivingTimelyRateV13(records),
        medicalRecordGradeARate: computeMedicalRecordGradeARateV13(records),
        medicalRecordFrontPagePassRate: computeMedicalRecordFrontPagePassRateV13(records),
      }));
    },
  },
];
