/**
 * 健澜科技 jlmedaios - 预约管理 V13 路由（M390-A）
 *
 * GET /api/v1/appointment-mgmt
 *
 * 权限：appointment-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAppointmentCancelRateV13,
  computeAppointmentNoShowRateV13,
  computeAppointmentVisitRateV13,
  type AppointmentMgmtRecordV13,
} from "../aggregators/appointmentMgmtV13Aggregator.js";

const records: AppointmentMgmtRecordV13[] = [
  { visitCount: 900, cancelCount: 50, noShowCount: 50, appointmentTotalCount: 1000 },
  { visitCount: 900, cancelCount: 50, noShowCount: 50, appointmentTotalCount: 1000 },
];

export const appointmentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/appointment-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "appointment-mgmt:read");
      if (denied) return denied;
      return json(ok({
        appointmentVisitRate: computeAppointmentVisitRateV13(records),
        appointmentCancelRate: computeAppointmentCancelRateV13(records),
        appointmentNoShowRate: computeAppointmentNoShowRateV13(records),
      }));
    },
  },
];
