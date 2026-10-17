/**
 * 健澜科技 jlmedaios - 预约诊疗 V13 路由（M337-B）
 *
 * GET /api/v1/appointment
 *
 * 权限：appointment:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAppointmentRateV13,
  computeFulfillmentRateV13,
  computeNoShowRateV13,
  type AppointmentRecordV13,
} from "../aggregators/appointmentV13Aggregator.js";

const records: AppointmentRecordV13[] = [
  { totalSlots: 1000, appointmentCount: 800, visitedCount: 720, noShowCount: 80 },
];

export const appointmentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/appointment",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "appointment:read");
      if (denied) return denied;
      return json(ok({
        appointmentRate: computeAppointmentRateV13(records),
        fulfillmentRate: computeFulfillmentRateV13(records),
        noShowRate: computeNoShowRateV13(records),
      }));
    },
  },
];
