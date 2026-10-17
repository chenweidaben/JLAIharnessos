/**
 * 健澜科技 jlmedaios - 远程医疗（统计）V13 路由（M367-B，stats避让）
 *
 * GET /api/v1/telemedicine-stats
 *
 * 权限：telemedicine-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRemoteConsultationCountV13,
  computeRemoteImagingDiagnosisCountV13,
  computeRemoteTeachingCountV13,
  type TelemedicineStatsRecordV13,
} from "../aggregators/telemedicineStatsV13Aggregator.js";

const records: TelemedicineStatsRecordV13[] = [
  { remoteConsultationCount: 10, remoteImagingDiagnosisCount: 15, remoteTeachingCount: 5 },
  { remoteConsultationCount: 20, remoteImagingDiagnosisCount: 25, remoteTeachingCount: 5 },
];

export const telemedicineStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/telemedicine-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "telemedicine-stats:read");
      if (denied) return denied;
      return json(ok({
        remoteConsultationCount: computeRemoteConsultationCountV13(records),
        remoteImagingDiagnosisCount: computeRemoteImagingDiagnosisCountV13(records),
        remoteTeachingCount: computeRemoteTeachingCountV13(records),
      }));
    },
  },
];
