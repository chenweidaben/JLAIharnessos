/**
 * 健澜科技 jlmedaios - 互联网医院（统计）V13 路由（M367-A，stats避让）
 *
 * GET /api/v1/internet-hospital-stats
 *
 * 权限：internet-hospital-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOnlineConsultationCountV13,
  computeOnlineFollowUpCountV13,
  computeOnlinePrescriptionCountV13,
  type InternetHospitalStatsRecordV13,
} from "../aggregators/internetHospitalStatsV13Aggregator.js";

const records: InternetHospitalStatsRecordV13[] = [
  { onlineConsultationCount: 500, onlinePrescriptionCount: 300, onlineFollowUpCount: 200 },
  { onlineConsultationCount: 500, onlinePrescriptionCount: 300, onlineFollowUpCount: 200 },
];

export const internetHospitalStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/internet-hospital-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "internet-hospital-stats:read");
      if (denied) return denied;
      return json(ok({
        onlineConsultationCount: computeOnlineConsultationCountV13(records),
        onlinePrescriptionCount: computeOnlinePrescriptionCountV13(records),
        onlineFollowUpCount: computeOnlineFollowUpCountV13(records),
      }));
    },
  },
];
