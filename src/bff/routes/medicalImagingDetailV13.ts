/**
 * 健澜科技 jlmedaios - 医学影像管理（细节）V13 路由（M415-B，detail 避让旧版 imagingTurnaroundV13）
 *
 * GET /api/v1/medical-imaging-detail
 *
 * 权限：medical-imaging-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeImagingDataArchivingRateV13,
  computeImagingEquipmentUptimeRateV13,
  computeImagingReportDiagnosisMatchRateV13,
  type MedicalImagingDetailRecordV13,
} from "../aggregators/medicalImagingDetailV13Aggregator.js";

const records: MedicalImagingDetailRecordV13[] = [
  { match: 950, reportTotal: 1000, uptime: 960, shouldUptimeTotal: 1000, archived: 990, shouldArchiveTotal: 1000 },
  { match: 950, reportTotal: 1000, uptime: 960, shouldUptimeTotal: 1000, archived: 990, shouldArchiveTotal: 1000 },
];

export const medicalImagingDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-imaging-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-imaging-detail:read");
      if (denied) return denied;
      return json(ok({
        imagingReportDiagnosisMatchRate: computeImagingReportDiagnosisMatchRateV13(records),
        imagingEquipmentUptimeRate: computeImagingEquipmentUptimeRateV13(records),
        imagingDataArchivingRate: computeImagingDataArchivingRateV13(records),
      }));
    },
  },
];
