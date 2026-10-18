/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 路由（M452-D，M452 收官，医院评审与临床质量改进组）
 *
 * GET /api/v1/medical-record-quality-mgmt
 *
 * 权限：medical-record-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalRecordHomepageQualifiedRateV13,
  computeMedicalRecordRecoveryTimelyRateV13,
  computeMedicalRecordWritingGradeARateV13,
  type MedicalRecordQualityMgmtRecordV13,
} from "../aggregators/medicalRecordQualityMgmtV13Aggregator.js";

const records: MedicalRecordQualityMgmtRecordV13[] = [
  { qualified: 950, totalHomepage: 1000, gradeA: 900, totalMedicalRecord: 1000, timely: 980, totalShouldRecover: 1000 },
  { qualified: 950, totalHomepage: 1000, gradeA: 900, totalMedicalRecord: 1000, timely: 980, totalShouldRecover: 1000 },
];

export const medicalRecordQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalRecordHomepageQualifiedRate: computeMedicalRecordHomepageQualifiedRateV13(records),
        medicalRecordWritingGradeARate: computeMedicalRecordWritingGradeARateV13(records),
        medicalRecordRecoveryTimelyRate: computeMedicalRecordRecoveryTimelyRateV13(records),
      }));
    },
  },
];
