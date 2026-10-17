/**
 * 健澜科技 jlmedaios - 病历完整性 V13 路由（M347-D，M347 收官）
 *
 * GET /api/v1/medical-record-integrity
 *
 * 权限：medical-record-integrity:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compute72hFilingRateV13,
  computeGradeARateV13,
  computeGradeCRateV13,
  type MedicalRecordIntegrityRecordV13,
} from "../aggregators/medicalRecordIntegrityV13Aggregator.js";

const records: MedicalRecordIntegrityRecordV13[] = [
  { gradeACount: 48, gradeCCount: 1, sampledCount: 50, filed72hCount: 49, shouldFileCount: 50 },
  { gradeACount: 47, gradeCCount: 1, sampledCount: 50, filed72hCount: 49, shouldFileCount: 50 },
];

export const medicalRecordIntegrityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-integrity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-integrity:read");
      if (denied) return denied;
      return json(ok({
        gradeARate: computeGradeARateV13(records),
        gradeCRate: computeGradeCRateV13(records),
        filing72hRate: compute72hFilingRateV13(records),
      }));
    },
  },
];
