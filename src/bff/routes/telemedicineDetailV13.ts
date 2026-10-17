/**
 * 健澜科技 jlmedaios - 远程医疗明细 V13 路由（M399-B，避让旧版 telemedicineV13/telemedicineStatsV13）
 *
 * GET /api/v1/telemedicine-detail
 *
 * 权限：telemedicine-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRemoteConsultationCountV13,
  computeRemoteImagingDiagnosisCountV13,
  computeRemoteOutpatientCountV13,
  type TelemedicineDetailRecordV13,
} from "../aggregators/telemedicineDetailV13Aggregator.js";

const records: TelemedicineDetailRecordV13[] = [
  { consultationCount: 10, imagingCount: 5, outpatientCount: 20 },
  { consultationCount: 10, imagingCount: 5, outpatientCount: 20 },
];

export const telemedicineDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/telemedicine-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "telemedicine-detail:read");
      if (denied) return denied;
      return json(ok({
        remoteConsultationCount: computeRemoteConsultationCountV13(records),
        remoteImagingDiagnosisCount: computeRemoteImagingDiagnosisCountV13(records),
        remoteOutpatientCount: computeRemoteOutpatientCountV13(records),
      }));
    },
  },
];
