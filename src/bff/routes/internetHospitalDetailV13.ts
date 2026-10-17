/**
 * 健澜科技 jlmedaios - 互联网医院明细 V13 路由（M399-A，避让旧版 internetHospital/internetHospitalStatsV13）
 *
 * GET /api/v1/internet-hospital-detail
 *
 * 权限：internet-hospital-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFollowupVisitRateV13,
  computeOnlineConsultationCountV13,
  computeOnlinePrescriptionCountV13,
  type InternetHospitalDetailRecordV13,
} from "../aggregators/internetHospitalDetailV13Aggregator.js";

const records: InternetHospitalDetailRecordV13[] = [
  { consultationCount: 100, prescriptionCount: 80, followupCount: 40 },
  { consultationCount: 100, prescriptionCount: 80, followupCount: 40 },
];

export const internetHospitalDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/internet-hospital-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "internet-hospital-detail:read");
      if (denied) return denied;
      return json(ok({
        onlineConsultationCount: computeOnlineConsultationCountV13(records),
        onlinePrescriptionCount: computeOnlinePrescriptionCountV13(records),
        followupVisitRate: computeFollowupVisitRateV13(records),
      }));
    },
  },
];
