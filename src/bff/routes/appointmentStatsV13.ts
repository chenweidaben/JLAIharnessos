/**
 * 健澜科技 jlmedaios - 预约服务统计 V13 路由（M378-A，stats 避让）
 *
 * GET /api/v1/appointment-stats
 *
 * 权限：appointment-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAppointmentCountV13,
  computeAppointmentVisitRateV13,
  computeNoShowRateV13,
  type AppointmentRecordV13,
} from "../aggregators/appointmentStatsV13Aggregator.js";

const records: AppointmentRecordV13[] = [
  { appointmentCount: 1000, visitCount: 950, noShowCount: 50 },
  { appointmentCount: 1000, visitCount: 950, noShowCount: 50 },
];

export const appointmentStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/appointment-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "appointment-stats:read");
      if (denied) return denied;
      return json(ok({
        appointmentCount: computeAppointmentCountV13(records),
        appointmentVisitRate: computeAppointmentVisitRateV13(records),
        noShowRate: computeNoShowRateV13(records),
      }));
    },
  },
];
