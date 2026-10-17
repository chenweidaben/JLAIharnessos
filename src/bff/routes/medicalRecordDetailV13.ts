/**
 * 健澜科技 jlmedaios - 病案管理（细节）V13 路由（M419-A，detail 避让旧版 medicalRecordMgmtV13）
 *
 * GET /api/v1/medical-record-detail
 *
 * 权限：medical-record-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalRecordCodingAccuracyRateV13,
  computeMedicalRecordCopyTimelyRateV13,
  computeMedicalRecordCoverPassRateV13,
  type MedicalRecordDetailRecordV13,
} from "../aggregators/medicalRecordDetailV13Aggregator.js";

const records: MedicalRecordDetailRecordV13[] = [
  { coverQualified: 950, coverTotal: 1000, codingAccurate: 980, codingTotal: 1000, copyTimely: 990, copyTotal: 1000 },
  { coverQualified: 950, coverTotal: 1000, codingAccurate: 980, codingTotal: 1000, copyTimely: 990, copyTotal: 1000 },
];

export const medicalRecordDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-detail:read");
      if (denied) return denied;
      return json(ok({
        medicalRecordCoverPassRate: computeMedicalRecordCoverPassRateV13(records),
        medicalRecordCodingAccuracyRate: computeMedicalRecordCodingAccuracyRateV13(records),
        medicalRecordCopyTimelyRate: computeMedicalRecordCopyTimelyRateV13(records),
      }));
    },
  },
];
