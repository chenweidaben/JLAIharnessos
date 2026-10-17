/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 路由（M413-A）
 *
 * GET /api/v1/medical-record-mgmt
 *
 * 权限：medical-record-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalRecordCopyComplianceRateV13,
  computeMedicalRecordGradeARateV13,
  computeMedicalRecordRecallTimelyRateV13,
  type MedicalRecordMgmtRecordV13,
} from "../aggregators/medicalRecordMgmtV13Aggregator.js";

const records: MedicalRecordMgmtRecordV13[] = [
  { gradeA: 950, total: 1000, timely: 98, recallTotal: 100, compliant: 99, copyTotal: 100 },
  { gradeA: 950, total: 1000, timely: 98, recallTotal: 100, compliant: 99, copyTotal: 100 },
];

export const medicalRecordMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalRecordGradeARate: computeMedicalRecordGradeARateV13(records),
        medicalRecordRecallTimelyRate: computeMedicalRecordRecallTimelyRateV13(records),
        medicalRecordCopyComplianceRate: computeMedicalRecordCopyComplianceRateV13(records),
      }));
    },
  },
];
