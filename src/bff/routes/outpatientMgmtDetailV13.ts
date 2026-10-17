/**
 * 健澜科技 jlmedaios - 门诊管理（细节）V13 路由（M416-C，detail 避让旧版 outpatientWait/appointment/referral/chronicDisease）
 *
 * GET /api/v1/outpatient-mgmt-detail
 *
 * 权限：outpatient-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientComplaintRateV13,
  computeOutpatientMedicalRecordPassRateV13,
  computeOutpatientPrescriptionPassRateV13,
  type OutpatientMgmtDetailRecordV13,
} from "../aggregators/outpatientMgmtDetailV13Aggregator.js";

const records: OutpatientMgmtDetailRecordV13[] = [
  { prescriptionQualified: 950, prescriptionTotal: 1000, recordQualified: 980, outpatientRecordTotal: 1000, complaint: 10, outpatientVisitTotal: 10000 },
  { prescriptionQualified: 950, prescriptionTotal: 1000, recordQualified: 980, outpatientRecordTotal: 1000, complaint: 10, outpatientVisitTotal: 10000 },
];

export const outpatientMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        outpatientPrescriptionPassRate: computeOutpatientPrescriptionPassRateV13(records),
        outpatientMedicalRecordPassRate: computeOutpatientMedicalRecordPassRateV13(records),
        outpatientComplaintRate: computeOutpatientComplaintRateV13(records),
      }));
    },
  },
];
